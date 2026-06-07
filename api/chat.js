const fs = require("fs");
const path = require("path");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) return;
	const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim();
		const value = trimmed
			.slice(eqIndex + 1)
			.trim()
			.replace(/^['"]|['"]$/g, "");
		if (key && process.env[key] === undefined) process.env[key] = value;
	}
}

loadEnvFile(path.join(__dirname, "..", ".env.local"));
loadEnvFile(path.join(__dirname, "..", ".env"));

function sendJson(res, statusCode, data) {
	res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.end(JSON.stringify(data));
}

function normalizeMessages(messages) {
	if (!Array.isArray(messages)) return [];
	return messages
		.filter((m) => m && (m.role === "user" || m.role === "assistant"))
		.slice(-12)
		.map((m) => ({
			role: m.role,
			content: String(m.content || "").slice(0, 2500),
		}));
}

function getLatestUserText(messages) {
	const latest = [...messages].reverse().find((m) => m.role === "user");
	return latest?.content || "";
}

function includesCrisisIntent(text) {
	return /tự hại|tự tử|muốn chết|không muốn sống|làm hại bản thân|làm hại người khác|suicide|kill myself|self-harm/i.test(
		text,
	);
}

function shouldSearchWeb(messages) {
	const text = getLatestUserText(messages);
	if (!text || includesCrisisIntent(text)) return false;
	return /tìm|search|google|web|internet|link|nguồn|source|website|youtube|spotify|podcast|phim|movie|nhạc|music|playlist|video|app|ứng dụng|bài viết|article|mới nhất|cập nhật|ở đâu|gợi ý.*(link|nguồn|web|youtube|spotify|podcast|phim|nhạc)/i.test(
		text,
	);
}

function getUserPreferences(assessment) {
	return assessment?.userPreferences || assessment?.userProfile?.preferences || "";
}

function detectResourceTypes(text) {
	const lower = String(text || "").toLowerCase();
	const types = new Set();
	if (/nhạc|music|playlist|spotify|youtube|piano|lofi|indie|acoustic|bài hát|song/.test(lower)) {
		types.add("music");
	}
	if (/podcast|audio|nghe/.test(lower)) types.add("podcast");
	if (/phim|movie|film|imdb|xem/.test(lower)) types.add("movie");
	if (/thở|breathing|thiền|meditation|mindfulness|yoga/.test(lower)) {
		types.add("exercise");
	}
	if (/bài viết|article|website|nguồn|source|đọc|read/.test(lower)) {
		types.add("article");
	}
	if (!types.size) {
		types.add("music");
		types.add("podcast");
		types.add("movie");
	}
	return [...types];
}

function buildSearchQueries(messages, assessment) {
	const latestText = getLatestUserText(messages);
	const preferences = getUserPreferences(assessment);
	const scaleName = assessment?.scale?.name || "mental health";
	const base = [latestText, preferences, scaleName].filter(Boolean).join(" ");
	const resourceTypes = detectResourceTypes(`${latestText} ${preferences}`);
	const queries = [];

	if (resourceTypes.includes("music")) {
		queries.push(`${preferences} relaxing music stress anxiety site:youtube.com`);
		queries.push(`${preferences} calming music playlist site:open.spotify.com`);
		queries.push(`${preferences} calming music playlist site:soundcloud.com`);
	}
	if (resourceTypes.includes("podcast")) {
		queries.push(`${preferences} mental health mindfulness podcast site:youtube.com`);
		queries.push(`${preferences} mental health mindfulness podcast site:open.spotify.com`);
		queries.push(`${preferences} mental health mindfulness podcast site:soundcloud.com`);
		queries.push(`${preferences} mental health mindfulness podcast site:podcasts.apple.com`);
	}
	if (resourceTypes.includes("movie")) {
		queries.push(`${preferences} feel good gentle movies site:imdb.com`);
		queries.push(`${preferences} relaxing animated short film site:youtube.com`);
	}
	if (resourceTypes.includes("exercise")) {
		queries.push(`${preferences} breathing exercise mindfulness anxiety site:youtube.com`);
	}
	if (resourceTypes.includes("article")) {
		queries.push(`${preferences} mental health self care video site:youtube.com`);
		queries.push(`${preferences} mental health podcast site:open.spotify.com`);
	}

	if (!queries.length) {
		queries.push(`${base} site:youtube.com`);
		queries.push(`${base} site:open.spotify.com`);
		queries.push(`${base} site:soundcloud.com`);
	}

	return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))]
		.slice(0, 5)
		.map((q) => q.slice(0, 400));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 7000) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, { ...options, signal: controller.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return response.json();
	} finally {
		clearTimeout(timeout);
	}
}

const DIRECT_RESOURCE_DOMAINS = [
	"youtube.com",
	"youtu.be",
	"open.spotify.com",
	"spotify.com",
	"soundcloud.com",
	"podcasts.apple.com",
	"music.apple.com",
	"imdb.com",
];

const DIRECT_RESOURCE_PRIORITY = [
	"youtube.com",
	"youtu.be",
	"open.spotify.com",
	"spotify.com",
	"soundcloud.com",
	"podcasts.apple.com",
	"music.apple.com",
	"imdb.com",
];

function getHostname(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
	} catch {
		return "";
	}
}

function isDirectResourceUrl(url) {
	const hostname = getHostname(url);
	return DIRECT_RESOURCE_DOMAINS.some(
		(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
	);
}

function normalizeSearchResult(result, query = "") {
	const url = String(result.url || result.FirstURL || "").trim();
	return {
		title: String(result.title || result.Text || "").trim(),
		url,
		snippet: String(result.snippet || result.content || result.Text || "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 520),
		query,
		hostname: getHostname(url),
	};
}

function getResourcePriority(url) {
	const hostname = getHostname(url);
	const index = DIRECT_RESOURCE_PRIORITY.findIndex(
		(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
	);
	return index === -1 ? DIRECT_RESOURCE_PRIORITY.length : index;
}

function filterDirectResourceResults(results) {
	return results.filter((result) => isDirectResourceUrl(result.url));
}

function sortDirectResourceResults(results) {
	return [...results].sort((a, b) => getResourcePriority(a.url) - getResourcePriority(b.url));
}

function dedupeSearchResults(results) {
	const seen = new Set();
	return results.filter((result) => {
		if (!result.url || seen.has(result.url)) return false;
		seen.add(result.url);
		return true;
	});
}

function collectDuckDuckGoTopics(topics, results) {
	for (const topic of topics || []) {
		if (topic.Topics) collectDuckDuckGoTopics(topic.Topics, results);
		else if (topic.FirstURL && topic.Text) {
			results.push(normalizeSearchResult(topic));
		}
	}
}

async function searchWithTavily(query) {
	const apiKey = process.env.TAVILY_API_KEY;
	if (!apiKey) return [];

	const data = await fetchJsonWithTimeout("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			api_key: apiKey,
			query,
			search_depth: "advanced",
			max_results: 8,
			include_answer: true,
			include_raw_content: false,
		}),
	}, 10000);

	return (data.results || [])
		.map((result) => normalizeSearchResult(result, query))
		.filter((r) => r.url && r.title);
}

async function searchWithDuckDuckGo(query) {
	const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
	const data = await fetchJsonWithTimeout(url);
	const results = [];

	if (data.AbstractURL && data.AbstractText) {
		results.push(
			normalizeSearchResult(
				{
					title: data.Heading || "DuckDuckGo result",
					url: data.AbstractURL,
					snippet: data.AbstractText,
				},
				query,
			),
		);
	}
	collectDuckDuckGoTopics(data.RelatedTopics, results);
	return results.filter((r) => r.url).slice(0, 5);
}

function formatWebResults(results) {
	if (!results.length) return "";
	return results
		.map(
			(result, index) =>
				`${index + 1}. ${result.title}\nURL: ${result.url}\nTruy vấn: ${result.query || ""}\nTóm tắt: ${result.snippet}`,
		)
		.join("\n\n");
}

function normalizeMarkdownLinks(content) {
	return String(content || "")
		.replace(/\[([^\]]+)]\s+\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)")
		.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\s+\)/g, "[$1]($2)")
		.replace(/\((https?:\/\/[^\s)]+)[.,，。]\)/g, "($1)");
}

function appendVerifiedSources(content, sources) {
	if (!sources?.length) return content;
	const existing = String(content || "");
	const missingSources = sources
		.filter((source) => source.title && source.url && !existing.includes(source.url))
		.slice(0, 5);
	if (!missingSources.length) return content;

	const sourceMarkdown = missingSources
		.map((source) => `- [${source.title.replace(/[\[\]]/g, "")}](${source.url})`)
		.join("\n");
	return `${existing.trim()}\n\n### Nguồn trực tiếp mình đã kiểm tra\n${sourceMarkdown}`;
}

function prepareAssistantReply(content, sources) {
	return normalizeMarkdownLinks(appendVerifiedSources(content, sources));
}

async function buildWebSearchContext(messages, assessment) {
	if (!shouldSearchWeb(messages)) return { context: "", sources: [] };
	const queries = buildSearchQueries(messages, assessment);
	try {
		let results = [];
		if (process.env.TAVILY_API_KEY) {
			const tavilyResultGroups = await Promise.all(
				queries.map((query) => searchWithTavily(query).catch(() => [])),
			);
			results = tavilyResultGroups.flat();
		}

		if (!results.length) {
			const duckResults = await searchWithDuckDuckGo(queries[0]);
			results = duckResults;
		}

		const sources = sortDirectResourceResults(
			filterDirectResourceResults(dedupeSearchResults(results)),
		).slice(0, 10);
		return {
			context: formatWebResults(sources),
			sources,
		};
	} catch (error) {
		console.warn("Web search failed:", error?.message || error);
		return { context: "", sources: [] };
	}
}

function buildAssessmentSummary(assessment) {
	if (!assessment) return "Không có dữ liệu bài sàng lọc.";

	const preferences =
		assessment.userPreferences || assessment.userProfile?.preferences || "";
	const highIntensity = assessment.answerSections?.highIntensity || [];
	const crisis = assessment.answerSections?.crisis || [];

	return JSON.stringify({
		userPreferences: preferences,
		scale: assessment.scale,
		scores: assessment.scores,
		result: assessment.result,
		highIntensityAnswers: highIntensity.slice(0, 8),
		crisisAnswers: crisis,
	});
}

function buildSystemPrompt(assessment, webSearchContext = "") {
	const userPreferences =
		assessment?.userPreferences || assessment?.userProfile?.preferences || "";
	const assessmentSummary = buildAssessmentSummary(assessment);
	const safeAssessment = assessment
		? JSON.stringify(assessment).slice(0, 7000)
		: "Không có dữ liệu bài sàng lọc.";

	return `Bạn là MindBuddy, trợ lý hỗ trợ sức khỏe tinh thần bằng tiếng Việt, giao tiếp theo phong cách của một chuyên gia tâm lý tận tâm: ấm áp, tinh tế, tôn trọng nhịp cảm xúc của người dùng và không phán xét.

Sở thích người dùng đã ghi: ${userPreferences || "Chưa ghi rõ"}

Tóm tắt dữ liệu ưu tiên cần dùng trước:
${assessmentSummary}

Kết quả web mới tìm được nếu câu hỏi cần nguồn/link/tài nguyên:
${webSearchContext || "Không có hoặc không cần tìm web cho câu hỏi này."}

Nguyên tắc dùng kết quả web:
- Chỉ dùng các kết quả từ nền tảng trực tiếp trong danh sách nguồn web: YouTube, Spotify, SoundCloud, Apple Podcasts, Apple Music, IMDb. Không dùng blog, báo, trang SEO, trang tổng hợp hoặc web chung chung để gợi ý tài nguyên giải trí/thư giãn.
- Khi có nhiều nguồn phù hợp, ưu tiên YouTube trước, sau đó mới đến Spotify, SoundCloud, Apple Podcasts/Apple Music, IMDb.
- Nếu có kết quả web từ nền tảng trực tiếp, hãy dùng chúng để gợi ý link/tài nguyên cụ thể và trích nguồn bằng Markdown.
- Link phải đúng Markdown chuẩn: [Tên tài nguyên](https://example.com). Không đặt khoảng trắng giữa ] và (, không dùng HTML, không để dấu chấm/phẩy nằm trong URL.
- Nếu không chắc link có thật, không tạo link Markdown giả; chỉ nói từ khóa người dùng có thể tìm.
- Chỉ được nêu tên tài nguyên cụ thể (bài nhạc, playlist, podcast, phim, app, video, nghệ sĩ/phiên bản) khi tên đó xuất hiện rõ trong kết quả web.
- Không tự chế các phiên bản như "piano version", "lofi version", "acoustic version" của một nghệ sĩ/bài hát nếu kết quả web không xác nhận có thật.
- Không bịa link, tên podcast/phim/app hoặc nguồn. Nếu kết quả web không đủ phù hợp, hãy nói nhẹ nhàng rằng bạn chưa tìm được nguồn trực tiếp thật sự sát trên YouTube/Spotify/SoundCloud/Apple Podcasts/IMDb.
- Khi gợi ý theo sở thích, hãy phân biệt rõ: "mình tìm thấy" (có nguồn web trực tiếp) và "bạn có thể thử tìm theo từ khóa" (không có nguồn xác nhận).
- Kết quả web chỉ là thông tin tham khảo; vẫn ưu tiên an toàn và phù hợp với trạng thái tâm lý của người dùng.

Nguyên tắc an toàn bắt buộc:
- Không chẩn đoán bệnh, không kê thuốc, không thay thế bác sĩ/chuyên gia tâm lý. Khi nói về kết quả trắc nghiệm, luôn xem đó là dữ liệu sàng lọc tham khảo.
- Dựa trên dữ liệu sàng lọc để phản hồi cá nhân hóa: điểm số, mức độ, câu trả lời cường độ cao, nhóm triệu chứng nổi bật, sở thích của người dùng trong trường userPreferences/userProfile.preferences, và bước tiếp theo phù hợp.
- Nếu người dùng nhắc đến tự hại, muốn chết, làm hại người khác, tuyệt vọng cấp tính, hoặc dữ liệu PHQ-9 câu 9 có điểm > 0: ưu tiên an toàn ngay ở đầu câu trả lời. Khuyến nghị liên hệ người thân đáng tin cậy, cơ sở y tế gần nhất, hoặc hotline 1900 9095. Không đưa nội dung có thể gây hại.
- Nếu câu hỏi ngoài phạm vi sức khỏe tinh thần/sàng lọc, trả lời ngắn và nhẹ nhàng đưa về hướng hỗ trợ phù hợp.

Phong cách trả lời:
- Viết như đang ngồi cạnh người dùng trong một buổi tham vấn đầu tiên: chậm rãi, nhân văn, cụ thể, không giáo điều.
- Tránh format cứng kiểu luôn đủ 4 mục hoặc đánh số máy móc. Hãy chọn cấu trúc tự nhiên theo điều người dùng hỏi.
- Có thể dùng Markdown với 2–4 heading mềm, ví dụ: "Mình nghe thấy điều này", "Điều kết quả đang gợi ý", "Một bước nhỏ có thể thử hôm nay", "Nếu bạn muốn tự chăm sóc nhẹ nhàng hơn".
- Ưu tiên đoạn văn ngắn + bullet khi cần. Không trả lời quá dài; thường 250–500 từ là đủ, trừ khi người dùng yêu cầu chi tiết.
- Phản ánh cảm xúc trước khi đưa lời khuyên. Ví dụ: "Nghe có vẻ bạn đã phải gồng khá nhiều..." rồi mới đến giải pháp.
- Hạn chế các câu sáo rỗng như "hãy suy nghĩ tích cực". Thay bằng hành động nhỏ, khả thi, có thể làm trong đời sống thật.

Cách chọn nội dung theo ý định user:
- Nếu user cần được động viên: tập trung công nhận cảm xúc, giảm tự trách, nhắc rằng kết quả là tín hiệu để chăm sóc bản thân, không phải nhãn dán con người họ.
- Nếu user hỏi về kết quả: giải thích nhẹ nhàng điểm số/mức độ/câu nổi bật, dùng ngôn ngữ "gợi ý", "có thể", "đáng để quan sát thêm".
- Nếu user hỏi giải pháp: đưa vài bước cụ thể theo mức độ ưu tiên, có thể chia "ngay hôm nay" và "trong tuần này" nhưng không bắt buộc.
- Nếu dữ liệu có userPreferences/userProfile.preferences: PHẢI thể hiện rõ đã dùng sở thích đó bằng cách nói tự nhiên như "Vì bạn có nhắc mình thích..." hoặc "Mình sẽ chọn hướng gần với sở thích của bạn..." trước khi gợi ý hoạt động, nhạc, podcast, phim, bài tập hoặc thói quen. Với tài nguyên cụ thể, chỉ chọn từ kết quả web nếu có.
- Nếu user hỏi sở thích hoặc hoạt động thư giãn: cá nhân hóa theo sở thích đã nói; nếu chưa biết, đề xuất vài lựa chọn nhẹ nhàng để họ chọn.
- Nếu chưa đủ thông tin, có thể hỏi 1 câu gợi mở ở cuối, không hỏi dồn dập.

Gợi ý tài nguyên khi phù hợp, kèm link Markdown tự nhiên trong câu trả lời:
- Nhạc thư giãn: [Spotify – Peaceful Piano](https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO)
- Nhạc ngủ/thư giãn: [YouTube – calming music](https://www.youtube.com/results?search_query=calming+music+for+anxiety)
- Podcast mindfulness: [Spotify – mindfulness podcasts](https://open.spotify.com/search/mindfulness%20podcasts)
- Podcast tiếng Việt về tâm lý/chữa lành: [Spotify search](https://open.spotify.com/search/t%C3%A2m%20l%C3%BD%20ch%E1%BB%AFa%20l%C3%A0nh%20podcast)
- Phim nhẹ nhàng: [IMDb – feel good movies](https://www.imdb.com/search/title/?genres=comedy,drama&keywords=feel-good)
- Bài tập thở: [YouTube – breathing exercise](https://www.youtube.com/results?search_query=breathing+exercise+anxiety)
Không gợi ý nội dung bạo lực, u ám, kích động hoặc liên quan tự hại.

Dữ liệu sàng lọc hiện tại:
${safeAssessment}`;
}

module.exports = async function handler(req, res) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		return sendJson(res, 405, { error: "Method not allowed" });
	}

	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		return sendJson(res, 500, {
			error:
				"Server chưa cấu hình GROQ_API_KEY. Hãy thêm biến môi trường GROQ_API_KEY trên Vercel hoặc khi chạy local.",
		});
	}

	try {
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

		const messages = normalizeMessages(body.messages);
		if (!messages.length) {
			return sendJson(res, 400, { error: "Thiếu nội dung chat." });
		}

		const webSearch = await buildWebSearchContext(messages, body.assessment);

		const groqResponse = await fetch(GROQ_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL,
				temperature: 0.6,
				max_tokens: 1100,
				messages: [
					{
						role: "system",
						content: buildSystemPrompt(body.assessment, webSearch.context),
					},
					...messages,
				],
			}),
		});

		const data = await groqResponse.json();
		if (!groqResponse.ok) {
			return sendJson(res, groqResponse.status, {
				error: data?.error?.message || "Groq API error",
			});
		}

		const rawReply =
			data?.choices?.[0]?.message?.content ||
			"Mình chưa tạo được phản hồi. Bạn thử hỏi lại nhé.";

		return sendJson(res, 200, {
			reply: prepareAssistantReply(rawReply, webSearch.sources),
			sources: webSearch.sources,
		});
	} catch (error) {
		return sendJson(res, 500, {
			error: error?.message || "Không thể xử lý yêu cầu chat.",
		});
	}
};

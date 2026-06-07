const fs = require("fs");
const path = require("path");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

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

function buildSystemPrompt(assessment) {
	const safeAssessment = assessment
		? JSON.stringify(assessment).slice(0, 9000)
		: "Không có dữ liệu bài sàng lọc.";

	return `Bạn là MindBuddy, trợ lý hỗ trợ sức khỏe tinh thần bằng tiếng Việt.

	Nguyên tắc bắt buộc:
	- Luôn trả lời ấm áp, ngắn gọn, dễ hiểu, không phán xét.
	- Không được chẩn đoán bệnh, không kê thuốc, không thay thế bác sĩ/chuyên gia tâm lý.
	- Dựa trên dữ liệu sàng lọc người dùng đã làm để giải thích ý nghĩa điểm số, câu trả lời nổi bật, và gợi ý bước tiếp theo an toàn.
	- Nếu người dùng nhắc đến tự hại, muốn chết, làm hại người khác, hoặc dữ liệu PHQ-9 câu 9 có điểm > 0: ưu tiên an toàn, khuyến nghị liên hệ người thân đáng tin cậy, cơ sở y tế gần nhất, hoặc hotline 1900 9095 ngay. Không đưa hướng dẫn có thể gây hại.
	- Không nói chắc chắn người dùng mắc bệnh. Dùng các cụm như "kết quả gợi ý", "có thể", "nên được chuyên gia đánh giá thêm".
	- Nếu người dùng hỏi ngoài phạm vi sức khỏe tinh thần/sàng lọc, trả lời ngắn và hướng về hỗ trợ phù hợp.

	Format trả lời bắt buộc bằng Markdown:
	## 1. Một lời động viên ngắn
	- Viết 2–4 câu nhẹ nhàng, công nhận cảm xúc của người dùng.
	- Không dùng lời hứa chắc chắn kiểu "mọi thứ sẽ ổn ngay".

	## 2. Giải pháp thực tế
	- Đưa 3–5 gợi ý cụ thể, dễ làm ngay.
	- Nếu phù hợp, chia thành "Trong 24 giờ tới" và "Trong 7 ngày tới".
	- Luôn nhắc rằng kết quả chỉ là sàng lọc tham khảo nếu đang giải thích điểm số.

	## 3. Gợi ý theo sở thích
	- Nếu người dùng đã nói sở thích, cá nhân hóa theo sở thích đó.
	- Nếu chưa biết sở thích, đề xuất 3 nhóm lựa chọn: nghe, xem, vận động/viết.
	- Luôn kèm link dạng Markdown. Ưu tiên link an toàn, phổ biến:
	  - Nhạc thư giãn: [Spotify – Peaceful Piano](https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO)
	  - Nhạc ngủ/thư giãn: [YouTube – calming music](https://www.youtube.com/results?search_query=calming+music+for+anxiety)
	  - Podcast mindfulness: [Spotify – mindfulness podcasts](https://open.spotify.com/search/mindfulness%20podcasts)
	  - Podcast tiếng Việt về chữa lành/tâm lý: [Spotify search](https://open.spotify.com/search/t%C3%A2m%20l%C3%BD%20ch%E1%BB%AFa%20l%C3%A0nh%20podcast)
	  - Phim nhẹ nhàng: [IMDb – feel good movies](https://www.imdb.com/search/title/?genres=comedy,drama&keywords=feel-good)
	  - Bài tập thở: [YouTube – breathing exercise](https://www.youtube.com/results?search_query=breathing+exercise+anxiety)
	- Không gợi ý nội dung bạo lực, u ám, kích động hoặc liên quan tự hại.

	## 4. Khi nào nên tìm hỗ trợ
	- Nêu dấu hiệu nên gặp chuyên gia bằng giọng nhẹ nhàng.
	- Nếu có dấu hiệu khẩn cấp, đặt phần này lên đầu câu trả lời và nhắc 1900 9095/cơ sở y tế gần nhất/người thân đáng tin cậy.

	Yêu cầu trình bày:
	- Dùng heading Markdown rõ ràng.
	- Dùng bullet ngắn.
	- Không quá dài trừ khi người dùng yêu cầu chi tiết.

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

		const groqResponse = await fetch(GROQ_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL,
				temperature: 0.45,
				max_tokens: 900,
				messages: [
					{ role: "system", content: buildSystemPrompt(body.assessment) },
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

		return sendJson(res, 200, {
			reply:
				data?.choices?.[0]?.message?.content ||
				"Mình chưa tạo được phản hồi. Bạn thử hỏi lại nhé.",
		});
	} catch (error) {
		return sendJson(res, 500, {
			error: error?.message || "Không thể xử lý yêu cầu chat.",
		});
	}
};

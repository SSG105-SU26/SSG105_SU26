const fs = require("fs");
const http = require("http");
const path = require("path");
const chatHandler = require("./api/chat");

const PORT = 3000;
const ROOT = __dirname;

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

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const mimeTypes = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".ico": "image/x-icon",
};

function serveStatic(req, res) {
	const url = new URL(req.url, `http://${req.headers.host}`);
	let pathname = decodeURIComponent(url.pathname);
	if (pathname === "/") pathname = "/index.html";

	const filePath = path.normalize(path.join(ROOT, pathname));
	if (!filePath.startsWith(ROOT)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Forbidden");
		return;
	}

	fs.readFile(filePath, (error, content) => {
		if (error) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Not found");
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, {
			"Content-Type": mimeTypes[ext] || "application/octet-stream",
		});
		res.end(content);
	});
}

const server = http.createServer((req, res) => {
	if (req.url === "/api/chat" || req.url.startsWith("/api/chat?")) {
		chatHandler(req, res);
		return;
	}

	serveStatic(req, res);
});

server.listen(PORT, () => {
	console.log(`MindBuddy running at http://localhost:${PORT}`);
	if (!process.env.GROQ_API_KEY) {
		console.warn(
			"Missing GROQ_API_KEY. Add it to .env.local before using chatbot.",
		);
	}
});

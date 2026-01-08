console.log("naisho collage loaded");

const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0r-rvE9vpx5H5bsD3wBf_qXWUBwfamSIg0KB_YUwB9UnELDLhXqA5ipHfgAFOvJ8DmUwMY2oFy2z/pub?gid=0&single=true&output=csv";

const DEFAULT_INSTAGRAM =
    "https://www.instagram.com/naishoroom/?hl=en";

const grid = document.getElementById("grid");

/* ---------- helpers ---------- */

function cacheBust(url) {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}_ts=${Date.now()}`;
}

function driveToDirect(url) {
    if (!url) return "";

    if (url.includes("drive.google.com/uc?")) return url;

    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
    }

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }

    return url;
}

/* minimal CSV parser */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            row.push(cell.trim());
            cell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (cell || row.length) {
                row.push(cell.trim());
                rows.push(row);
            }
            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows
        .filter((r) => r.some((v) => v))
        .map((r) => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = r[i] || "";
            });
            return obj;
        });
}

function postHeight() {
    const height = document.documentElement.scrollHeight;
    window.parent?.postMessage(
        { type: "naisho-collage-height", height },
        "*"
    );
}

/* ---------- rendering ---------- */

function createTile({ mediaUrl, alt, link }) {
    const tile = document.createElement("div");
    tile.className = "tile";

    const a = document.createElement("a");
    a.href = link || DEFAULT_INSTAGRAM;
    a.target = "_blank";
    a.rel = "noopener";

    const img = document.createElement("img");
    img.className = "media";
    img.alt = alt || "Naisho Room photo";
    img.loading = "lazy";
    img.src = mediaUrl;

    const video = document.createElement("video");
    video.className = "media";
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.style.display = "none";

    const source = document.createElement("source");
    source.src = mediaUrl;
    video.appendChild(source);

    let settled = false;

    img.onload = () => {
        if (settled) return;
        settled = true;
        video.remove();
    };

    img.onerror = () => {
        video.style.display = "block";
    };

    video.onloadeddata = () => {
        if (settled) return;
        settled = true;
        img.remove();
    };

    a.appendChild(img);
    a.appendChild(video);
    tile.appendChild(a);

    return tile;
}

/* ---------- main ---------- */

async function init() {
    try {
        const res = await fetch(cacheBust(CSV_URL), { cache: "no-store" });
        if (!res.ok) throw new Error("CSV fetch failed");

        const text = await res.text();
        const rows = parseCSV(text);

        const items = rows
            .map((r) => ({
                media: driveToDirect(r.image_url),
                alt: r.alt_text,
                link: r.instagram_link_url,
            }))
            .filter((r) => r.media)
            .slice(0, 9);

        if (!items.length) {
            postHeight();
            return;
        }

        items.forEach((item) => {
            const tile = createTile({
                mediaUrl: item.media,
                alt: item.alt,
                link: item.link,
            });
            grid.appendChild(tile);
        });

        postHeight();
        window.addEventListener("resize", postHeight);
    } catch (err) {
        console.error("Naisho collage failed to load", err);
        postHeight();
    }
}

init();

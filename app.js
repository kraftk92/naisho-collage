console.log("naisho collage loaded");

const SHEET_GVIZ_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0r-rvE9vpx5H5bsD3wBf_qXWUBwfamSIg0KB_YUwB9UnELDLhXqA5ipHfgAFOvJ8DmUwMY2oFy2z/gviz/tq?gid=0&tqx=out:json;responseHandler=naishoCollageCallback";

const DEFAULT_INSTAGRAM = "https://www.instagram.com/naishoroom/?hl=en";

const grid = document.getElementById("grid");

/* ---------- helpers ---------- */

function driveToDirect(url) {
    if (!url) return "";

    const u = String(url).trim();
    if (!u) return "";

    if (u.includes("drive.google.com/uc?")) return u;

    const fileMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;

    const idMatch = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;

    return u;
}

function postHeight() {
    const height = document.documentElement.scrollHeight;
    window.parent?.postMessage({ type: "naisho-collage-height", height }, "*");
}

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
    img.decoding = "async";
    img.src = mediaUrl;

    const video = document.createElement("video");
    video.className = "media";
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
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
        // If image fails, try video.
        video.style.display = "block";
    };

    video.onloadeddata = () => {
        if (settled) return;
        settled = true;
        img.remove();
    };

    video.onerror = () => {
        // If video fails too, keep the tile blank. Silent fail.
    };

    a.appendChild(img);
    a.appendChild(video);
    tile.appendChild(a);
    return tile;
}

/* ---------- gviz parsing ---------- */
/*
GViz response shape:
response.table.cols -> headers
response.table.rows -> row cells
Each cell: { v: value }
*/
function gvizToObjects(gvizResponse) {
    const table = gvizResponse?.table;
    if (!table?.cols || !table?.rows) return [];

    const headers = table.cols.map((c) => String(c.label || "").trim());

    return table.rows.map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
            const cell = r.c?.[i];
            obj[h] = cell && cell.v != null ? String(cell.v).trim() : "";
        });
        return obj;
    });
}

/* ---------- callback used by JSONP ---------- */
window.naishoCollageCallback = func

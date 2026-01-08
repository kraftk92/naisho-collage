console.log("naisho collage loaded");

const SHEET_GVIZ_URL =
    "https://docs.google.com/spreadsheets/d/1vf4w7PEqwr2Q0SB94fAMx8v-G89HcFnJCD9wOrOE4s4/gviz/tq?gid=0&tqx=out:json;responseHandler=naishoCollageCallback";

const DEFAULT_INSTAGRAM = "https://www.instagram.com/naishoroom/?hl=en";

const grid = document.getElementById("grid");

/* ---------- helpers ---------- */

function driveToDirect(url) {
    if (!url) return "";

    const u = String(url).trim();
    if (!u) return "";

    // If it's already a direct google content link, return it
    if (u.includes("googleusercontent.com")) return u;

    let id = null;

    // Match /file/d/ID patterns
    const fileMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        id = fileMatch[1];
    } else {
        // Match ?id=ID patterns
        const idMatch = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) id = idMatch[1];
    }

    // Return the high-res image format if we found an ID
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w1000`;

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
window.naishoCollageCallback = function (response) {
    const data = gvizToObjects(response);

    // Clear existing grid content just in case
    grid.innerHTML = "";

    if (!data || data.length === 0) {
        console.warn("No data found in response.");
        return;
    }

    data.forEach((row) => {
        // Mapping based on user provided column names:
        // image_url -> The image source
        // instagram_link_url -> The click-through link (handling potential extra text in header)
        // alt_text -> Alt text

        const instagramKey = Object.keys(row).find(k => k.toLowerCase().includes("instagram_link_url"));
        const imageUrl = row.image_url;
        const note = row.alt_text;

        // Basic validation
        if (!imageUrl) return;

        const tile = createTile({
            mediaUrl: driveToDirect(imageUrl),
            alt: note,
            link: instagramKey ? row[instagramKey] : DEFAULT_INSTAGRAM,
        });
        grid.appendChild(tile);
    });

    postHeight();
};

// Shim to handle the default callback from Google Sheets API
window.google = window.google || {};
window.google.visualization = window.google.visualization || {};
window.google.visualization.Query = window.google.visualization.Query || {};
window.google.visualization.Query.setResponse = window.naishoCollageCallback;

// Initiate the JSONP request
const script = document.createElement("script");
script.src = SHEET_GVIZ_URL;
document.body.appendChild(script);

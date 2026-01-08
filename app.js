console.log("naisho collage loaded");

const SHEET_GVIZ_URL =
    "https://docs.google.com/spreadsheets/d/1vf4w7PEqwr2Q0SB94fAMx8v-G89HcFnJCD9wOrOE4s4/gviz/tq?gid=0&tqx=out:json;responseHandler=naishoCollageCallback";

const DEFAULT_INSTAGRAM = "https://www.instagram.com/naishoroom/?hl=en";

const grid = document.getElementById("grid");

/* ---------- helpers ---------- */

function getDriveId(url) {
    if (!url) return null;
    const u = String(url).trim();
    if (!u) return null;

    // Routine to process "already direct" links or raw IDs could go here, 
    // but for now we focus on extracting IDs from Drive links.

    // Match /file/d/ID patterns
    const fileMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    // Match ?id=ID patterns
    const idMatch = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];

    return null;
}

function driveToVisual(url) {
    // Returns a URL suitable for an Iframe Preview
    // This is the only robust way to get a non-black thumbnail for video files
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return url;
}

function driveToStream(url) {
    // Deprecated/Unused but keeping helper just in case
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    return url;
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

    // Use Iframe for the visual. 
    // This loads the Google Drive Preview player which shows the correct "Poster Frame".
    const iframe = document.createElement("iframe");
    iframe.className = "media";
    iframe.title = alt || "Naisho Room media";
    iframe.loading = "lazy";
    iframe.src = driveToVisual(mediaUrl);

    // Style cleanup
    iframe.style.border = "0";
    iframe.setAttribute("scrolling", "no");

    // CRITICAL: pointer-events: none allows clicks to pass through the iframe
    // so the user actually clicks the <a> tag (Instagram link) instead of playing the video.
    iframe.style.pointerEvents = "none";

    a.appendChild(iframe);
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
            mediaUrl: imageUrl, // Pass raw URL; createTile handles the split logic
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

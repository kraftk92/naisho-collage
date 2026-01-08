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
    // Returns a URL suitable for an <img> tag (high-res thumbnail)
    // We use the lh3 endpoint because it allows CORS (needed for brightness check)
    // and returns high-quality images.
    const id = getDriveId(url);
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w1000`;
    return url;
}

function driveToPreview(url) {
    // Returns a URL suitable for an Iframe Preview
    // Used as fallback when the lh3 thumbnail is black (video)
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return url;
}

function postHeight() {
    const height = document.documentElement.scrollHeight;
    window.parent?.postMessage({ type: "naisho-collage-height", height }, "*");
}

function isImageDark(img) {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        // Draw the image onto the 1x1 canvas
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;

        // Calculate brightness (average of R, G, B)
        // Data structure: [r, g, b, alpha]
        const brightness = (data[0] + data[1] + data[2]) / 3;

        // Threshold: If brightness is very low (< 30/255), consider it black/dark.
        return brightness < 30;
    } catch (e) {
        // If analysis fails (e.g. CORS issue), assume it is NOT dark to be safe.
        // We prefer showing an image than an iframe if unsure.
        console.warn("Unable to analyze image brightness", e);
        return false;
    }
}

function createTile({ mediaUrl, alt, link }) {
    const tile = document.createElement("div");
    tile.className = "tile";

    const a = document.createElement("a");
    a.href = link || DEFAULT_INSTAGRAM;
    a.target = "_blank";
    a.rel = "noopener";

    // Start with the Image (Visual)
    const img = document.createElement("img");
    img.className = "media";
    img.alt = alt || "Naisho Room photo";
    img.loading = "lazy";
    img.decoding = "async";
    img.setAttribute("referrerpolicy", "no-referrer");

    // Enable CORS so we can read the pixels in 'isImageDark'
    img.crossOrigin = "Anonymous";

    img.src = driveToVisual(mediaUrl);

    // Smart Detection Logic
    img.onload = () => {
        if (isImageDark(img)) {
            // It's a black thumbnail (Video)
            console.log("Dark thumbnail detected, styling as video link:", mediaUrl);

            // Boost visibility of the dark frame
            img.classList.add("dark-thumb");

            // 1. Create Play Button Overlay
            const playBtn = document.createElement("div");
            playBtn.className = "play-button";
            // More prominent Play Icon
            playBtn.innerHTML = `
                <div class="play-icon-bg">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="white" style="margin-left: 4px;"><path d="M8 5v14l11-7z"/></svg>
                </div>
            `;

            // 2. Append visually, but NO specific click handler. 
            // The Play Button has pointer-events: none, so clicks pass through to the <a> tag.
            // This will open the Instagram link in a new tab, just like images.
            tile.appendChild(playBtn);
        }
    };

    a.appendChild(img);
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

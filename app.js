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
    if (id) return `https://drive.google.com/file/d/${id}/preview?t=5s`;
    return url;
}

function driveToStream(url) {
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
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
    // If it's a video, we want the click to play the video, not strict navigation
    // But initially, let's keep the link wrapper. We'll handle video clicks specifically.
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
            // It's a black thumbnail (likely Video) -> Swap to Native Video
            console.log("Dark thumbnail detected (likely video), swapping to video tag:", mediaUrl);

            const video = document.createElement("video");
            video.className = "media";
            video.src = driveToStream(mediaUrl);
            video.playsInline = true;
            video.loop = true;
            video.muted = false; // User can unmute or we start unmuted? Instagram starts muted. 
            // Let's start unmuted as it requires interaction to play anyway.

            // Fix "Black Box" by seeking to 1s
            video.currentTime = 1;

            // Fix "Rendered Youtube Video" look by using native video without default controls
            // visual: object-fit: cover (from .media class) handles the "Zoom/Fill" issue

            // Handle Interaction
            video.onclick = (e) => {
                e.preventDefault(); // Prevent link navigation
                e.stopPropagation();
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            };

            // Attempt to load metadata to ensure currentTime works
            video.preload = "metadata";
            video.onloadeddata = () => {
                if (video.currentTime === 0) video.currentTime = 1;
            };

            // Fallback: If video fails to load (quota/error), revert to iframe? 
            // For now, let's stick to video. If it fails, it might show poster/nothing.
            // We can set specific poster if we had one.

            img.replaceWith(video);
        }
        // Else: It's a colorful photo -> Keep img
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

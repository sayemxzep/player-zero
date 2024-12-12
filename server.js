const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create a downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
require('fs').mkdirSync(downloadsDir, { recursive: true });

app.get('/api/youtube', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const outputPath = path.join(downloadsDir, '%(title)s.%(ext)s');
    const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" ${url}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error}`);
            return res.status(500).json({ error: 'Failed to process video' });
        }

        // Get the filename from stdout
        const filename = stdout.match(/\[download\] Destination: (.+\.mp3)/)?.[1];
        if (filename) {
            res.json({
                success: true,
                audioUrl: `/downloads/${path.basename(filename)}`,
                title: path.basename(filename, '.mp3')
            });
        } else {
            res.status(500).json({ error: 'Could not process video' });
        }
    });
});

app.use('/downloads', express.static(downloadsDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
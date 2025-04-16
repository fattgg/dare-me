const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors()); // allow requests from your React Native app

cloudinary.config({
    cloud_name: 'dw0p7uxa6',
    api_key: 'dareme_private',
    api_secret: 'oqHZZXBzyOjMuJ7h93jq-wgg6oM',
});

app.get('/signed-url', (req, res) => {
    const { publicId, resourceType = 'image' } = req.query;

    if (!publicId) {
        return res.status(400).json({ error: 'Missing publicId' });
    }

    const timestamp = Math.floor(Date.now() / 1000) + 3600; // 1hr expiry
    const signature = cloudinary.utils.api_sign_request(
        { public_id: publicId, timestamp },
        cloudinary.config().api_secret
    );

    const signedUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/${resourceType}/authenticated/${publicId}?timestamp=${timestamp}&signature=${signature}&api_key=${cloudinary.config().api_key}`;

    res.json({ signedUrl });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
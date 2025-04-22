require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());

// Get Cloudinary credentials from environment variables
const CLOUD_NAME = process.env.CLOUD_NAME || 'dw0p7uxa6';
const API_KEY = process.env.CLOUD_API_KEY || '527387447475928';
const API_SECRET = process.env.CLOUD_API_SECRET || 'oqHZZXBzyOjMuJ7h93jq-wgg6oM';

// Debug log to verify credentials
console.log('Server starting with:');
console.log('CLOUD_NAME:', CLOUD_NAME);
console.log('API_KEY:', API_KEY);
console.log('API_SECRET:', API_SECRET && API_SECRET.substring(0, 3) + '...');

app.get('/generate-signed-url', (req, res) => {
  try {
    const publicId = req.query.public_id;
    if (!publicId) {
      return res.status(400).json({ error: 'public_id is required' });
    }

    const type = req.query.resource_type || 'image';
    const timestamp = Math.floor(Date.now() / 1000);

    // Create the string to sign
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    // Construct the delivery URL with transformation for authenticated delivery
    const signedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/${type}/upload/s--${signature.substr(0, 8)}--/${publicId}?api_key=${API_KEY}&timestamp=${timestamp}&signature=${signature}`;

    console.log('Generated signed URL for:', publicId);

    res.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
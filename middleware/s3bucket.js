// // Fetch from S3 and update S3_BUCKET_URL
const fetchBaseUrl = async () => {
  try {
    const response = await fetch(
      'https://bitload4u.s3.eu-central-1.amazonaws.com/qblockdurgoutsav-firebase-adminsdk-fbsvc-6030aaf550.json',
    );

    if (response.ok) {
      const content = await response.text();
      const match = content.match(/S3_BUCKET_URLL\s*=\s*['"`]([^'"`]+)['"`]/);

      if (match) {
        BASE_URL = match[1];
        console.log('S3_BUCKET_URLupdated:', S3_BUCKET_URL);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch S3_BUCKET_URL from S3, using fallback:', error);
  }
};

// Initialize on import
fetchBaseUrl();

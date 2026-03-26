
async function testBanners() {
    try {
        console.log('Testing banners API...');
        const response = await fetch('http://localhost:5002/api/banners');

        const data = await response.json() as { banners?: Array<{ title?: string; isActive?: boolean }> };

        if (response.ok) {
            console.log('Banners API Success!');
            console.log('Status:', response.status);
            const banners = data.banners || [];
            console.log('Banners found:', banners.length);
            if (banners.length > 0) {
                banners.forEach((b) => console.log(`- ${b.title || 'Untitled'} (${b.isActive ? 'Active' : 'Inactive'})`));
            }
        } else {
            console.log('Banners API Failed!');
            console.log('Status:', response.status);
            console.log('Data:', data);
        }
    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testBanners();

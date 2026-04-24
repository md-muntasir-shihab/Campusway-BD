
async function testLogin() {
    try {
        console.log(`Testing login for ${process.env.TEST_LOGIN_EMAIL || 'student@campusway.com'}...`);
        const response = await fetch(`http://localhost:${process.env.PORT || 5002}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: process.env.TEST_LOGIN_EMAIL || 'student@campusway.com',
                password: process.env.TEST_LOGIN_PASSWORD || ''
            })
        });

        const data = await response.json() as any;

        if (response.ok) {
            console.log('Login Success!');
            console.log('Status:', response.status);
            console.log('User Role:', data.user.role);
        } else {
            console.log('Login Failed!');
            console.log('Status:', response.status);
            console.log('Data:', data);
        }
    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testLogin();

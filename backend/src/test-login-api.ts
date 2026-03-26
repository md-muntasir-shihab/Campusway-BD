
async function testLogin() {
    try {
        console.log('Testing login for student@campusway.com...');
        const response = await fetch('http://localhost:5002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'student@campusway.com',
                password: 'admin123'
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

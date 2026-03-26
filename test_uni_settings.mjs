async function test() {
    const loginRes = await fetch('http://localhost:5003/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@campusway.com', password: 'admin' }) // Use default admin password from QA
    });
    
    let loginData = await loginRes.json();
    if (!loginData.ok) {
        const loginResRetry = await fetch('http://localhost:5003/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@campusway.com', password: 'admin123456' })
        });
        loginData = await loginResRetry.json();
    }
    
    console.log('Login:', loginData.ok ? 'SUCCESS' : loginData);
    
    const token = loginData?.data?.accessToken;
    if (!token) {
        console.error('No token!');
        return;
    }
    
    const test1 = await fetch('http://localhost:5003/api/campusway-secure-admin/settings/university', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET settings/university:', test1.status);
    console.log(await test1.text());
}

test();

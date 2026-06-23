
(async () => {
    try {
        console.log('Logging in as admin...');
        const loginRes = await fetch('http://localhost:5003/api/auth/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@campusway.com', password: 'Admin@123456' })
        });
        const loginData = await loginRes.json();
        
        if (!loginRes.ok) {
            console.log('Admin login failed:', loginData);
            
            // Try student login
            console.log('Trying student login...');
            const stuLogin = await fetch('http://localhost:5003/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'student@campusway.com', password: 'Student@123456' })
            });
            const stuData = await stuLogin.json();
            if (!stuLogin.ok) {
                console.log('Student login failed too:', stuData);
                return;
            }
            var token = stuData.data?.accessToken;
        } else {
            var token = loginData.accessToken || loginData.data?.accessToken || loginData.token;
        }
        if (!token) {
            console.log('No token found in response:', loginData);
            return;
        }
        console.log('Logged in. Token:', token.substring(0, 20) + '...');
        
        // Let's just find any exam
        console.log('Fetching exams...');
        const examsRes = await fetch('http://localhost:5003/api/admin/exams', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const examsData = await examsRes.json();
        
        if (!examsData.data?.exams?.length) {
            console.log('No exams found.');
            return;
        }
        
        // Find a published exam
        const exam = examsData.data.exams.find(e => e.status === 'published' || e.status === 'draft') || examsData.data.exams[0];
        console.log(`Found Exam: ${exam._id} (${exam.title}) - Status: ${exam.status}`);
        
        // Now hit the start/resume endpoint!
        console.log('Logging in as student to start exam...');
        const stuLogin = await fetch('http://localhost:5003/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'student@campusway.com', password: 'Student@123456' })
        });
        const stuData = await stuLogin.json();
        const stuToken = stuData.accessToken || stuData.data?.accessToken || stuData.token;
        
        console.log('Attempting to start/resume exam as student...');
        const startRes = await fetch(`http://localhost:5003/api/exams/${exam._id}/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${stuToken}` }
        });
        const startData = await startRes.json();
        
        if (!startRes.ok) {
            console.error('Failed to start exam:', startData);
            return;
        }
        
        const questions = startData.data?.questions || [];
        console.log(`\n===========================================`);
        console.log(`SUCCESS! Started exam ${exam._id}`);
        console.log(`Questions loaded: ${questions.length}`);
        if (questions.length > 0) {
            console.log(`Example Question 1: ${questions[0].question_en || questions[0].question_bn}`);
        } else {
            console.log(`Still 0 questions. Let's dump the response object:`, Object.keys(startData.data));
            if (startData.data?.questions) {
                 console.log(`Questions array length:`, startData.data.questions.length);
            }
        }
        console.log(`===========================================\n`);
    } catch (e) {
        console.error('Error:', e.message);
    }
})();

async function run() {
    console.log('Fetching services from Render...');
    const response = await fetch('https://api.render.com/v1/services', {
        headers: {
            'Authorization': `Bearer rnd_8sVIKhDXDSML3Xc9sL570FUJpDt4`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error('Error fetching services:', response.status, await response.text());
        return;
    }

    const services = await response.json();
    console.log(`Found ${services.length} services:`);
    for (const service of services) {
        const s = service.service || service;
        console.log(`- Name: ${s.name}, ID: ${s.id}, Type: ${s.type}`);
        
        // Fetch env variables for this service
        console.log(`  Fetching env variables for service ${s.id}...`);
        const envResponse = await fetch(`https://api.render.com/v1/services/${s.id}/env-vars`, {
            headers: {
                'Authorization': `Bearer rnd_8sVIKhDXDSML3Xc9sL570FUJpDt4`,
                'Accept': 'application/json'
            }
        });

        if (envResponse.ok) {
            const envVars = await envResponse.json();
            console.log('  Env variables:');
            for (const envVar of envVars) {
                const ev = envVar.envVar || envVar;
                console.log(`    ${ev.key}: ${ev.value}`);
            }
        } else {
            console.error('  Failed to fetch env variables:', envResponse.status);
        }
    }
}

run();

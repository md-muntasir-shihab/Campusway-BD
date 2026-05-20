async function run() {
    const serviceId = 'srv-d72p0igule4c73desrig';
    console.log(`Fetching details for service ${serviceId}...`);
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
        headers: {
            'Authorization': `Bearer rnd_8sVIKhDXDSML3Xc9sL570FUJpDt4`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error('Error fetching service:', response.status, await response.text());
        return;
    }

    const service = await response.json();
    console.log('Service Details:');
    console.log(`- Name: ${service.name}`);
    console.log(`- Branch: ${service.repoDetails?.branch}`);
    console.log(`- Auto Deploy: ${service.autoDeploy}`);
    console.log(`- Deploy Hook URL: ${service.deployHookUrl}`);
    
    // Fetch recent deploys
    console.log('\nFetching recent deploys...');
    const deploysResponse = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=5`, {
        headers: {
            'Authorization': `Bearer rnd_8sVIKhDXDSML3Xc9sL570FUJpDt4`,
            'Accept': 'application/json'
        }
    });

    if (deploysResponse.ok) {
        const deploys = await deploysResponse.json();
        console.log('Recent Deploys:');
        for (const d of deploys) {
            const dep = d.deploy || d;
            console.log(`- ID: ${dep.id}, Status: ${dep.status}, Trigger: ${dep.trigger}, Created At: ${dep.createdAt}`);
        }
    }
}

run();

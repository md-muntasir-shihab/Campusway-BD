const { MongoClient } = require('mongodb');

async function run() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    const db = client.db('campusway');
    const collection = db.collection('homesettings');
    const doc = await collection.findOne({});
    if (!doc || !doc.hero) {
        console.log('No hero data found.');
        process.exit(0);
    }
    console.log('Before:', JSON.stringify(doc.hero.subtitle, null, 2));

    const newSubtitle = doc.hero.subtitle
        .replace('Form updates', 'From updates')
        .replace('upskalling', 'upskilling');

    const result = await collection.updateOne({}, {
        $set: { 'hero.subtitle': newSubtitle }
    });
    
    console.log('Update result:', result);
    await client.close();
}

run().catch(console.error);

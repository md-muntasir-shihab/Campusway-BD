import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import University from '../models/University';
import UniversityCluster from '../models/UniversityCluster';
import { reconcileUniversityClusterAssignments } from '../services/universitySyncService';

async function main() {
    const directUri = 'mongodb://muntasirshihab:M9esK8ApWvdZeXL@ac-kuktokv-shard-00-00.anbbjyt.mongodb.net:27017,ac-kuktokv-shard-00-01.anbbjyt.mongodb.net:27017,ac-kuktokv-shard-00-02.anbbjyt.mongodb.net:27017/campusway?ssl=true&replicaSet=atlas-7z86m2-shard-0&authSource=admin';
    await mongoose.connect(directUri);
    console.log('Connected to DB');

    const name = 'Test Uni Bulk Debug ' + Date.now();
    const uni = await University.create({
        name,
        shortForm: 'TBD',
        category: 'Science & Technology',
        clusterGroup: 'E2E Cluster',
        isActive: true,
        featured: false,
        slug: 'test-uni-bulk-debug-' + Date.now()
    });
    console.log('Created university ID:', uni._id, 'clusterGroup:', uni.clusterGroup);

    // Call reconcile to see if it immediately wipes 'E2E Cluster'
    await reconcileUniversityClusterAssignments();
    const afterReconcile = await University.findById(uni._id).lean();
    console.log('After reconcile, clusterGroup:', afterReconcile?.clusterGroup);

    // Try updating to 'E2E Updated Cluster'
    await University.updateOne({ _id: uni._id }, { $set: { clusterGroup: 'E2E Updated Cluster', clusterName: 'E2E Updated Cluster' } });
    const afterUpdate = await University.findById(uni._id).lean();
    console.log('After update (before reconcile), clusterGroup:', afterUpdate?.clusterGroup);

    await reconcileUniversityClusterAssignments();
    const afterSecondReconcile = await University.findById(uni._id).lean();
    console.log('After second reconcile, clusterGroup:', afterSecondReconcile?.clusterGroup);

    await University.findByIdAndDelete(uni._id);
    await mongoose.disconnect();
}

main().catch(console.error);

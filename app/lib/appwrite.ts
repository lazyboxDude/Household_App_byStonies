import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Debugging: Check if config is loaded
if (typeof window !== 'undefined') {
    console.log('Appwrite Config:', {
        endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
        projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? 'Loaded' : 'Missing'
    });
}

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };

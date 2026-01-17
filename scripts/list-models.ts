import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: GOOGLE_GENERATIVE_AI_API_KEY not found in environment.');
    process.exit(1);
}

async function listModels() {
    console.log('🔍 Querying Google AI API for available models...');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        if (!response.ok) {
            const errorMsg = `Error: ${response.status} ${response.statusText}`;
            fs.writeFileSync('available_models.txt', errorMsg);
            console.error(errorMsg);
            return;
        }

        const data = await response.json() as { models?: any[] };
        const models = data.models || [];

        if (models.length === 0) {
            console.log('⚠️ No models found.');
            fs.writeFileSync('available_models.txt', 'No models found');
            return;
        }

        const output = models
            .filter(m => m.name.includes('gemini') || m.name.includes('gemma'))
            .map(m => `${m.name.replace('models/', '')} | ${m.displayName}`)
            .join('\n');

        fs.writeFileSync('available_models.txt', output);
        console.log('✅ Models saved to available_models.txt');
        console.log('Preview:', output.slice(0, 200) + '...');

    } catch (error) {
        console.error('❌ Failed:', error);
        fs.writeFileSync('available_models.txt', `Exception: ${error}`);
    }
}

listModels();

/**
 * Batch save misspelled words at the end of the quiz
 * @param {Array<{word: string, count: number}>} misspelledArray
 */
async function saveMisspelledWordsBatch(misspelledArray) {
    // Expose batch function globally for use in spell-game.js
    window.saveMisspelledWordsBatch = saveMisspelledWordsBatch;
    if (!supabase || !currentUser) {
        console.error('Supabase not initialized or missing user.');
        return;
    }
    for (const { word, count } of misspelledArray) {
        // Step 1: Check if word already exists
        const { data, error } = await supabase
            .from('misspelled_words')
            .select('mistake_count')
            .eq('user_id', currentUser)
            .eq('word', word)
            .single();

        let mistakeCount = count;
        if (data) {
            mistakeCount = data.mistake_count + count;
        }

        // Step 2: Insert or update with incremented count
        const { error: upsertError } = await supabase
            .from('misspelled_words')
            .upsert({
                user_id: currentUser,
                word: word,
                mistake_count: mistakeCount
            }, {
                onConflict: ['user_id', 'word']
            });

        if (upsertError) {
            console.error('Upsert error:', upsertError.message);
        } else {
            console.log(`Batch saved "${word}" for ${currentUser} with count ${mistakeCount}`);
        }
    }
}
// supabase.js

// ✅ Initialize Supabase client
const SUPABASE_URL = 'https://dncprmyydkycllctnksz.supabase.co';     // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY3BybXl5ZGt5Y2xsY3Rua3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjg0MDksImV4cCI6MjA3MDkwNDQwOX0.-kIb-4LDO6xP13sGik2VgRrwV3Wsro9jUbLOZUYNSkQ';

// Replace with your anon public key
// You should define `currentUser` before calling these methods
let supabase = null;

/**
 * Initialize Supabase client for a given user
 * @param {string} userId
 */
function initSupabase(userId) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                'User-id': userId
            }
        }
    });
}

/**
 * Save a misspelled word (upsert with mistake count increment)
 */
async function saveMisspelledWord(word) {
    if (!supabase || !currentUser) {
        console.error('Supabase not initialized or missing user.');
        return;
    }

    // Step 1: Check if word already exists
    const { data, error } = await supabase
        .from('misspelled_words')
        .select('mistake_count')
        .eq('user_id', currentUser)
        .eq('word', word)
        .single();

    let mistakeCount = 1;

    if (data) {
        mistakeCount = data.mistake_count + 1;
    }

    // Step 2: Insert or update with incremented count
    const { error: upsertError } = await supabase
        .from('misspelled_words')
        .upsert({
            user_id: currentUser,
            word: word,
            mistake_count: mistakeCount
        }, {
            onConflict: ['user_id', 'word']
        });

    if (upsertError) {
        console.error('Upsert error:', upsertError.message);
    } else {
        console.log(`Saved "${word}" for ${currentUser} with count ${mistakeCount}`);
    }
}

/**
 * Fetch all misspelled words for the current user
 */
async function getMisspelledWords() {
    if (!supabase) {
        console.error('Supabase not initialized. Call initSupabase(userId) first.');
        return;
    }

    const { data, error } = await supabase
        .from('misspelled_words')
        .select('*')
        .eq('user_id', currentUser);

    if (error) {
        console.error('Error fetching words:', error.message);
    } else {
        console.log('Your mistakes:', data);
        return data;
    }
}

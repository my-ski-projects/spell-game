// supabase.js

// ✅ Initialize Supabase client
const SUPABASE_URL = 'https://dncprmyydkycllctnksz.supabase.co';     // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY3BybXl5ZGt5Y2xsY3Rua3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjg0MDksImV4cCI6MjA3MDkwNDQwOX0.-kIb-4LDO6xP13sGik2VgRrwV3Wsro9jUbLOZUYNSkQ';                      // Replace with your anon public key

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
                'user-id': userId
            }
        }
    });
}

/**
 * Insert or update a misspelled word for the current user
 * @param {string} word - The misspelled word
 */
async function saveMisspelledWord(word) {
    if (!supabase) {
        console.error('Supabase not initialized. Call initSupabase(userId) first.');
        return;
    }

    const { data, error } = await supabase
        .from('misspelled_words')
        .upsert({
            user_id: currentUser,         // Assumes currentUser is declared globally
            word: word,
            mistake_count: 1
        }, {
            onConflict: ['user_id', 'word']
        });

    if (error) {
        console.error('Error saving word:', error.message);
    } else {
        console.log('Saved:', data);
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
        .select('*');

    if (error) {
        console.error('Error fetching words:', error.message);
    } else {
        console.log('Your mistakes:', data);
        return data;
    }
}

/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: musicData.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Music Production Data
 * Ported from NGKsStudios comprehensive music database
 */

export const GENRE_CATEGORIES = {
  'Hip-Hop': [
    'Boom Bap', 'Mumble Rap', 'Trap', 'Drill', 'Old School Hip-Hop',
    'Conscious Rap', 'Gangsta Rap', 'Alternative Hip-Hop', 'Cloud Rap',
    'Jazz Rap', 'Hardcore Hip-Hop', 'Southern Rap', 'East Coast Hip-Hop',
    'West Coast Hip-Hop', 'Midwest Hip-Hop', 'UK Drill', 'Afrobeats Hip-Hop',
    'Latin Trap', 'Emo Rap', 'Melodic Rap', 'Phonk', 'Horrorcore',
    'Club Rap', 'Pop Rap',
    'Chopped and Screwed', 'Crunk', 'Hyphy', 'Snap Music', 'Jersey Club'
  ],
  'Rock': [
    'Southern Rock', 'Glam Rock', 'Hair Metal', 'Progressive Rock',
    'Psychedelic Rock', 'Classic Rock', 'Hard Rock', 'Punk Rock',
    'Alternative Rock', 'Indie Rock', 'Grunge', 'Post-Rock', 'Art Rock',
    'Blues Rock', 'Folk Rock', 'Arena Rock', 'Garage Rock', 'Surf Rock',
    'Rockabilly', 'Post-Punk', 'New Wave', 'Britpop', 'Shoegaze',
    'Math Rock', 'Stadium Rock', 'Symphonic Rock', 'Space Rock',
    'Stoner Rock', 'Desert Rock', 'Noise Rock', 'Industrial Rock'
  ],
  'Metal': [
    'Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash Metal',
    'Power Metal', 'Progressive Metal', 'Doom Metal', 'Sludge Metal',
    'Stoner Metal', 'Nu Metal', 'Metalcore', 'Deathcore',
    'Blackened Death Metal', 'Symphonic Metal', 'Folk Metal',
    'Viking Metal', 'Industrial Metal', 'Gothic Metal', 'Groove Metal',
    'Speed Metal'
  ],
  'EDM': [
    'House', 'Deep House', 'Tech House', 'Progressive House',
    'Big Room House', 'Techno', 'Minimal Techno', 'Detroit Techno',
    'Trance', 'Progressive Trance', 'Psytrance', 'Uplifting Trance',
    'Dubstep', 'Future Bass', 'Trap EDM', 'Hardstyle', 'Drum & Bass',
    'Liquid DnB', 'Neurofunk', 'Jungle', 'Breakbeat', 'UK Garage'
  ],
  'Country': [
    'Traditional Country', 'Outlaw Country', 'Country Rock', 'Country Pop',
    'Bluegrass', 'Honky Tonk', 'Western Swing', 'Nashville Sound',
    'Bakersfield Sound', 'Alt-Country', 'Americana', 'Country Folk',
    'Cowpunk', 'Country Rap', 'Bro Country', 'Red Dirt'
  ],
  'Pop': [
    'Mainstream Pop', 'Dance Pop', 'Electropop', 'Synthpop', 'Teen Pop',
    'K-Pop', 'J-Pop', 'Indie Pop', 'Art Pop', 'Baroque Pop', 'Chamber Pop',
    'Dream Pop', 'Power Pop', 'Bubblegum Pop', 'Sophisti-Pop', 'Hyperpop',
    'Dark Pop', 'Tropical House'
  ],
  'R&B': [
    'Contemporary R&B', 'Neo-Soul', 'Alternative R&B', 'New Jack Swing',
    'Quiet Storm', 'Funk', 'P-Funk', 'Minneapolis Sound', 'Smooth R&B',
    'Gospel R&B', 'Hip-Hop Soul', 'Trap Soul', 'PBR&B', 'Future R&B'
  ],
  'Jazz': [
    'Smooth Jazz', 'Bebop', 'Cool Jazz', 'Hard Bop', 'Free Jazz',
    'Fusion Jazz', 'Latin Jazz', 'Acid Jazz', 'Nu Jazz',
    'Contemporary Jazz', 'Swing', 'Big Band', 'Dixieland', 'Ragtime',
    'Modal Jazz', 'Post-Bop', 'Avant-Garde Jazz'
  ],
  'Electronic': [
    'Ambient', 'Downtempo', 'Chillout', 'Trip-Hop', 'IDM', 'Glitch',
    'Breakcore', 'Synthwave', 'Vaporwave', 'Future Funk', 'Darksynth',
    'Cyberpunk', 'Industrial', 'EBM', 'Witch House', 'Footwork', 'Juke',
    'UK Bass', 'Grime'
  ],
  'Classical': [
    'Baroque', 'Classical Period', 'Romantic', 'Modern Classical',
    'Contemporary Classical', 'Minimalism', 'Neoclassical',
    'Chamber Music', 'Orchestral', 'Opera', 'Choral', 'Sacred Music',
    'Film Score', 'Crossover Classical'
  ],
  'Reggae': [
    'Roots Reggae', 'Dub', 'Dancehall', 'Ragga', 'Lovers Rock',
    'One Drop', 'Steppers', 'Digital Reggae', 'Reggae Fusion',
    'Reggaeton', 'Ska', 'Two Tone', 'Third Wave Ska'
  ],
  'Folk': [
    'Traditional Folk', 'Contemporary Folk', 'Folk Rock', 'Indie Folk',
    'Psychedelic Folk', 'Dark Folk', 'Neofolk', 'Freak Folk', 'Anti-Folk',
    'New Weird America', 'Celtic Folk', 'Bluegrass', 'Old-Time',
    'Appalachian', 'Sea Shanties'
  ],
  'Blues': [
    'Delta Blues', 'Chicago Blues', 'Electric Blues', 'Texas Blues',
    'Piedmont Blues', 'Country Blues', 'Rhythm and Blues', 'Jump Blues',
    'Blues Rock', 'British Blues', 'Contemporary Blues', 'Soul Blues'
  ],
  'World': [
    'Afrobeat', 'Reggaeton', 'Bossa Nova', 'Samba', 'Tango', 'Flamenco',
    'Celtic', 'Indian Classical', 'Bollywood', 'Arabic Pop', 'K-Pop',
    'J-Pop', 'Latin Pop', 'Salsa', 'Merengue', 'Cumbia', 'Mariachi',
    'Fado', 'Klezmer'
  ],
  'Alternative': [
    'Indie Rock', 'Indie Pop', 'Alternative Rock', 'Post-Punk',
    'Post-Rock', 'Shoegaze', 'Dream Pop', 'Noise Rock', 'Math Rock',
    'Emo', 'Screamo', 'Post-Hardcore', 'Experimental', 'Lo-Fi',
    'Bedroom Pop', 'Chillwave'
  ]
};

export const INSTRUMENT_CATEGORIES = {
  'Guitar': [
    // Acoustic
    'Steel String Acoustic', 'Nylon String Classical', 'Twelve String Acoustic',
    'Resonator Guitar', 'Parlor Guitar', 'Jumbo Acoustic', 'Dreadnought Acoustic',
    // Electric
    'Lead Electric Guitar', 'Rhythm Electric Guitar', 'Clean Electric Guitar',
    'Distorted Electric Guitar', 'Overdriven Electric Guitar', 'Fuzz Electric Guitar',
    'Stratocaster Style', 'Les Paul Style', 'Telecaster Style',
    'Hollow Body Electric', 'Semi-Hollow Electric', 'Seven String Guitar',
    'Eight String Guitar', 'Baritone Guitar',
    // Specialty
    'Slide Guitar', 'Lap Steel Guitar', 'Pedal Steel Guitar', 'Dobro',
    'National Steel Guitar', 'Prepared Guitar', 'MIDI Guitar', 'E-Bow Guitar'
  ],
  'Bass': [
    'Lead Bass', 'Rhythm Bass', 'Slap Bass', 'Pop Bass', 'Fingerstyle Bass',
    'Pick Bass', 'Fretted Electric Bass', 'Fretless Electric Bass',
    'Five String Bass', 'Six String Bass', 'Piccolo Bass', 'Extended Range Bass',
    'Upright Bass', 'Acoustic Bass Guitar', 'Double Bass', 'Electric Upright Bass',
    'Chapman Stick', 'Bass VI', 'Synth Bass', 'Sub Bass', 'Octave Bass'
  ],
  'Drums': [
    // Kits
    'Standard Acoustic Drum Kit', 'Jazz Drum Kit', 'Rock Drum Kit',
    'Fusion Drum Kit', 'Big Band Drum Kit', 'Electronic Drum Kit',
    'Hybrid Drum Kit', 'Trigger Drums',
    // Individual
    'Kick Drum', 'Snare Drum', 'Side Snare', 'Piccolo Snare', 'Brass Snare',
    'Wood Snare', 'Rack Tom', 'Floor Tom', 'Octobans', 'Rototoms',
    'Hi-Hat', 'Open Hi-Hat', 'Closed Hi-Hat', 'Splash Cymbal', 'Crash Cymbal',
    'Ride Cymbal', 'China Cymbal', 'Stack Cymbals', 'Sizzle Cymbal', 'Bell Cymbal'
  ],
  'Percussion': [
    // Mallet
    'Marimba', 'Vibraphone', 'Xylophone', 'Glockenspiel', 'Steel Drums',
    'Balafon', 'Gamelan', 'Tubular Bells', 'Mark Tree', 'Crotales',
    // Hand
    'Djembe', 'Conga Drums', 'Bongo Drums', 'Tabla', 'Darbuka',
    'Frame Drum', 'Bodhran', 'Pandeiro', 'Tambourine', 'Shakers',
    'Maracas', 'Claves', 'Wood Block', 'Cowbell', 'Agogo Bells',
    'Triangle', 'Finger Cymbals', 'Castanets',
    // Specialty
    'Timpani', 'Concert Bass Drum', 'Tam-Tam', 'Thunder Sheet',
    'Rain Stick', 'Ocean Drum', 'Singing Bowl', 'Hang Drum',
    'Cajon', 'Udu Drum', 'Talking Drum'
  ],
  'Orchestral Strings': [
    'Solo Violin', 'First Violin Section', 'Second Violin Section',
    'Viola Solo', 'Viola Section', 'Cello Solo', 'Cello Section',
    'Double Bass Solo', 'Double Bass Section', 'String Ensemble',
    'String Quartet', 'String Orchestra',
    'Pizzicato Strings', 'Arco Strings', 'Tremolo Strings',
    'Spiccato Strings', 'Staccato Strings', 'Legato Strings',
    'Sul Ponticello', 'Sul Tasto', 'Con Sordino', 'Harmonics',
    'Double Stops', 'Glissando Strings'
  ],
  'Folk Strings': [
    'Banjo', 'Bluegrass Banjo', 'Tenor Banjo', 'Plectrum Banjo',
    'Mandolin', 'Mandola', 'Octave Mandolin', 'Mandocello',
    'Dulcimer', 'Hammered Dulcimer', 'Autoharp', 'Zither',
    'Harp', 'Celtic Harp', 'Concert Harp', 'Lap Harp',
    'Ukulele', 'Concert Ukulele', 'Tenor Ukulele', 'Baritone Ukulele',
    'Bouzouki', 'Balalaika', 'Sitar', 'Koto', 'Erhu'
  ],
  'Keyboards': [
    // Piano
    'Grand Piano', 'Upright Piano', 'Electric Piano', 'Rhodes',
    'Wurlitzer', 'Clavinet', 'Prepared Piano', 'Honky Tonk Piano',
    'Toy Piano', 'Celesta',
    // Organs
    'Pipe Organ', 'Hammond Organ', 'Church Organ', 'Jazz Organ',
    'Rock Organ', 'Reed Organ', 'Harmonium', 'Accordion', 'Concertina',
    // Electronic
    'Analog Synthesizer', 'Digital Synthesizer', 'Modular Synth',
    'Polyphonic Synth', 'Monophonic Synth', 'FM Synth', 'Wavetable Synth',
    'Granular Synth', 'Physical Modeling Synth'
  ],
  'Brass': [
    'Trumpet', 'Piccolo Trumpet', 'Flugelhorn', 'Cornet',
    'French Horn', 'Wagner Tuba', 'Mellophone',
    'Trombone', 'Bass Trombone', 'Alto Trombone', 'Valve Trombone',
    'Euphonium', 'Baritone Horn',
    'Tuba', 'Sousaphone', 'Contrabass Tuba',
    'Brass Section', 'Brass Ensemble', 'Brass Quintet',
    'Muted Trumpet', 'Harmon Muted Trumpet', 'Cup Muted Trumpet'
  ],
  'Woodwinds': [
    'Flute', 'Piccolo', 'Alto Flute', 'Bass Flute', 'Panflute',
    'Recorder', 'Tin Whistle', 'Pennywhistle', 'Fife',
    'Clarinet', 'Bass Clarinet', 'Contrabass Clarinet', 'Eb Clarinet',
    'Oboe', 'English Horn', 'Oboe d\'Amore', 'Bassoon', 'Contrabassoon',
    'Saxophone', 'Alto Sax', 'Tenor Sax', 'Soprano Sax', 'Baritone Sax',
    'Bass Sax', 'Sopranino Sax'
  ],
  'Vocals': [
    'Lead Vocals', 'Background Vocals', 'Choir', 'Gospel Choir',
    'Chamber Choir', 'Boys Choir', 'Barbershop Quartet',
    'Soprano', 'Mezzo-Soprano', 'Alto', 'Tenor', 'Baritone', 'Bass',
    'Falsetto', 'Head Voice', 'Chest Voice', 'Whisper Vocals',
    'Spoken Word', 'Rap Vocals', 'Scream Vocals', 'Growl Vocals',
    'Opera Vocals', 'Scat Singing', 'Yodeling', 'Throat Singing',
    'Beatbox', 'Vocal Percussion', 'A Cappella'
  ],
  'Synthesizers': [
    'Analog Lead', 'Analog Pad', 'Analog Bass',
    'Digital Synth', 'FM Synth', 'Wavetable Synth',
    'Moog Synth', 'ARP Synth', 'Prophet Synth',
    'DX7 Style', 'Juno Style', 'Jupiter Style',
    'Ambient Pad', 'String Pad', 'Choir Pad',
    'Supersaw', 'Pluck Synth', 'Synth Lead',
    'Synth Brass', 'Synth Strings', 'Synth Bass',
    'Atmospheric Synth', 'Cinematic Synth', 'Retro Synth'
  ]
};

export const MOODS = [
  'Uplifting', 'Melancholy', 'Aggressive', 'Dreamy', 'Dark',
  'Triumphant', 'Calm', 'Energetic', 'Mysterious', 'Romantic',
  'Epic', 'Chill', 'Intense', 'Playful', 'Somber',
  'Nostalgic', 'Cinematic', 'Groovy', 'Ethereal', 'Powerful',
  'Relaxing', 'Dramatic', 'Euphoric', 'Atmospheric', 'Haunting'
];

export const TEMPO_PRESETS = [
  { name: 'Very Slow', bpm: 60, description: 'Largo, Grave' },
  { name: 'Slow', bpm: 76, description: 'Adagio, Lento' },
  { name: 'Moderate', bpm: 108, description: 'Andante, Moderato' },
  { name: 'Medium Fast', bpm: 120, description: 'Allegretto' },
  { name: 'Fast', bpm: 144, description: 'Allegro' },
  { name: 'Very Fast', bpm: 168, description: 'Presto, Vivace' },
  { name: 'Extremely Fast', bpm: 200, description: 'Prestissimo' }
];

export const SONG_STRUCTURES = [
  {
    name: 'Pop Standard',
    template: 'Intro - Verse - Chorus - Verse - Chorus - Bridge - Chorus - Outro',
    description: 'Classic pop song structure'
  },
  {
    name: 'Verse-Chorus',
    template: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
    description: 'Simple, effective structure'
  },
  {
    name: 'Pre-Chorus Build',
    template: 'Verse - Pre-Chorus - Chorus - Verse - Pre-Chorus - Chorus - Bridge - Chorus',
    description: 'Builds tension before chorus'
  },
  {
    name: 'EDM Drop',
    template: 'Intro - Build - Drop - Breakdown - Build - Drop - Bridge - Final Drop - Outro',
    description: 'Electronic dance music structure'
  },
  {
    name: 'Hip-Hop',
    template: 'Intro - Verse 1 - Hook - Verse 2 - Hook - Bridge - Hook - Outro',
    description: 'Rap/hip-hop structure'
  },
  {
    name: 'Rock/Metal',
    template: 'Intro - Verse - Chorus - Verse - Chorus - Solo - Bridge - Chorus - Outro',
    description: 'Classic rock structure with solo'
  },
  {
    name: 'Jazz Standard',
    template: 'Intro - Head - Solo Section - Trading - Head - Outro',
    description: 'Traditional jazz structure'
  }
];

export const STRUCTURE_TAGS = {
  core: ['[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Outro]', '[Refrain]'],
  instrumental: ['[Instrumental]', '[Solo]', '[Guitar Solo]', '[Piano Solo]', '[Drum Solo]', '[Bass Solo]'],
  edm: ['[Build]', '[Drop]', '[Breakdown]', '[Build-Up]', '[Filter Sweep]', '[Vocal Chop]'],
  hiphop: ['[Verse 1]', '[Verse 2]', '[Verse 3]', '[Hook]', '[Ad-libs]', '[Scratch]', '[Beatbox]', '[Freestyle]'],
  vocal: ['[Vocal Run]', '[Harmony]', '[Call and Response]', '[Whisper]', '[Scream]', '[Falsetto]', '[Auto-Tune]'],
  dynamics: ['[Slow]', '[Fast]', '[Quiet]', '[Loud]', '[Fade In]', '[Fade Out]', '[Silence]', '[Stop]']
};

export default {
  GENRE_CATEGORIES,
  INSTRUMENT_CATEGORIES,
  MOODS,
  TEMPO_PRESETS,
  SONG_STRUCTURES,
  STRUCTURE_TAGS
};


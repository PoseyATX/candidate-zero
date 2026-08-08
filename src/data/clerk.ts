/**
 * CANDIDATE ZERO — the filing counter, 4:41 on the last afternoon.
 *
 * Character creation was a grid of cards. Then it was a grid of cards with
 * paragraphs on them, and then three grids of cards with paragraphs and stat
 * lines. All three times it was the same object: a menu. You cannot make a menu
 * immersive by writing better labels on it.
 *
 * So this is not a menu. It is a scene with one other person in it.
 *
 * You are at the counter in the county clerk's office on the last day of
 * filing. Wanda Kettle has been deputy clerk in this county for nineteen years
 * and has watched roughly four hundred people do exactly what you are about to
 * do. She asks the questions on the form, in order, one at a time. You answer
 * in your own voice. She writes it down, and she has something to say about it,
 * because she always does.
 *
 * The design rules that follow from that, and which the UI enforces:
 *
 *   · ONE question on screen at a time. A wall of twelve options is a menu
 *     again no matter how it is styled.
 *   · Answers are things you SAY — first person, in quotes — not tiles with
 *     "CLOSE +3 · DIPLOMACY −1" printed on the face. The numbers are real and
 *     they are shown on the form at the end, where a form is the right place
 *     for them. On the face of a sentence they turn a conversation back into a
 *     spreadsheet.
 *   · She REACTS. Every answer gets a line back, specific to that answer. That
 *     single beat is most of the difference between a form and a person.
 *   · The application fills in as you talk, in ink, line by line. The interface
 *     is the document, not a wrapper around one.
 */

/** Who is on the other side of the counter. */
export const CLERK = {
  name: 'Wanda Kettle',
  title: 'Deputy County Clerk',
  /** The room, established once, before she says anything. */
  scene:
    'The counter smells like toner and old carpet. There is a paper clock face taped ' +
    'to the glass with the hands set at 6:00 and CLOSED written under it in marker. ' +
    'It is 4:41. The woman behind the counter has been deputy clerk here for nineteen ' +
    'years and has watched about four hundred people stand where you are standing.',
  /** What she says while the ink dries and you take the pen. */
  sign:
    'She turns the form around and sets the pen on top of it, and does not let go ' +
    'of it right away.'
} as const;

/** Her line for each beat of the form, in her voice. */
export const CLERK_ASKS: Record<string, string> = {
  name: '"Name as you want it printed on the ballot. Not what your mother calls you — what goes on the ballot."',
  persona: '"And what is it you do?"',
  trade: '"Before any of this. What did you do for a living?"',
  first: '"You ever stood up and talked in front of people? How did it go?"',
  skeleton:
    '"Last one, and I ask everybody. Is there anything in your past the other side is going to find?"',
  issue: '"What are you running on? One thing. They only print one."',
  place: '"Which seat, and which part of the country is it in?"',
  sign: '"Then that is the form. You want to read it before you sign it. Most people do not."'
};

/**
 * What she says back.
 *
 * Keyed by answer id across every question, because answer ids are unique. A
 * missing entry is not a crash, it is silence — but silence is the failure
 * state here, so `harness:clerk` asserts every answer has a line.
 */
export const CLERK_REPLIES: Record<string, string> = {
  // --- who you are ---
  blockwalker:
    'She looks up for the first time. "I know you. You did my street in the spring for the other fella." She does not say whether she voted.',
  believer:
    'Her pen stops. "I heard about the hospital." A pause you could park a truck in. "Lot of people are angry. Angry does not always file."',
  staffer:
    '"Staff." She writes it without looking. "I have met a hundred of you. Nine of them ran. Two of them won, and neither one was the smart one."',
  fadedname:
    'She reads the surname twice and her mouth does something that is not quite a smile. "Your granddaddy sold my daddy a truck in \'71. It was a bad truck."',

  // --- the trade ---
  route:
    '"Then you already know the county better than the map does." She writes ROUTE and underlines it once, which she does not do for everyone.',
  counter:
    '"Retail." She nods at the window. "You will be fine right up until somebody asks you about school finance."',
  office:
    '"Government." A dry beat. "So you know how long everything takes, and it is still going to surprise you."',
  crew: '"Hard work." She writes it down. "That plays. Right up until you are tired and somebody has a camera."',

  // --- the first room ---
  angry:
    '"Angry reads honest the first time and unstable the fourth." She is not warning you. She is just saying.',
  cards:
    '"Prepared." She almost approves. "Nobody has ever been moved by a man reading. But nobody has ever caught one out either."',
  laugh:
    '"Funny is worth about four points and costs you the same four the day something serious happens."',
  handed:
    'She stops writing. "You gave the speech away." She looks at you properly. "That works in a room. It does not work on a ballot. Your name is the one going on this."',

  // --- the thing they will find ---
  bankruptcy:
    '"Money." She does not look up. "About a third of them say money. It is on a mailer in October and it is over by November."',
  dwi: '"Long time ago." She writes it in the same handwriting as everything else. "It is never as long ago as you think it is."',
  payroll:
    '"Family on the county." Now she does look up. "That one has ended more of these than the drinking has."',
  crossover:
    'The pen stops for the second time. "In the other primary." Flat. "Son, they can pull that in about four minutes and they will."',

  // --- what you run on: falls back to the persona lens, see nameplate-draft ---
  // --- where you file ---
  safe: '"Safe seat." She shrugs. "Nobody will spend a dollar beating you. Nobody will spend one helping you either."',
  competitive:
    '"That one is real." She sets the pen down. "Both sides will spend. You are going to be a line in somebody\'s model by August."',
  wrong:
    'She looks at you a moment longer than she needs to. "In that district. With your name." She writes it anyway. "All right."'
};

/** Everything she could say back, for coverage checks. */
export const CLERK_REPLY_IDS = Object.keys(CLERK_REPLIES);

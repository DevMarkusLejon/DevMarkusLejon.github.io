export const MANUAL = 'https://www.ikea.com/se/en/assembly_instructions/kallax-shelving-unit-white__AA-2703308-1-100.pdf';
export const ALTERNATIVE_MANUAL = 'https://www.ikea.com/se/en/assembly_instructions/kallax-shelving-unit-white__AA-1009450-15-100.pdf';

export const product = {
  name: 'KALLAX',
  subtitle: 'The four-cube shelving unit',
  article: '202.758.14',
  color: 'White',
  size: '77 × 77 cm',
  width: 765,
  height: 765,
  depth: 390,
  dimensionUnit: 'mm',
  manual: 'AA-2703308-1',
  manualDate: '2026-03-24',
  version: '10-dowel version',
  productUrl: 'https://www.ikea.com/se/en/p/kallax-shelving-unit-white-20275814/',
  limits: { shelfKg: 13, topKg: 25, wallCabinetKg: 20 },
};

export const inventory = [
  { id: 'outer-long', name: 'Long outer panels', quantity: 2, code: null, kind: 'panel', detail: 'Top and base; thick outer panels.' },
  { id: 'outer-side', name: 'Outer side panels', quantity: 2, code: null, kind: 'panel', detail: 'Left and right; shorter thick panels.' },
  { id: 'middle', name: 'Full-width middle shelf', quantity: 1, code: null, kind: 'panel', detail: 'The one long, thin internal panel.' },
  { id: 'short-dividers', name: 'Short dividers', quantity: 2, code: null, kind: 'panel', detail: 'The two short, thin internal panels.' },
  { id: 'long-screws', name: 'Long assembly screws', quantity: 8, code: '104321 / 104322', kind: 'screw', detail: 'Alternative part numbers for the same listed quantity.' },
  { id: 'dowels', name: 'Wooden dowels', quantity: 10, code: '101339', kind: 'dowel', detail: 'Count these first to match this guide to your kit.' },
  { id: 'bracket-screws', name: 'Short bracket screws', quantity: 4, code: '100372', kind: 'screw', detail: 'Two per wall bracket.' },
  { id: 'brackets', name: 'Wall angle brackets', quantity: 2, code: '115753', kind: 'bracket', detail: 'Required for both floor-standing and wall-hung installation.' },
  { id: 'plates', name: 'Locking plates', quantity: 2, code: '103693', kind: 'plate', detail: 'Secure each wall screw within its bracket.' },
  { id: 'covers', name: 'Bracket covers', quantity: 2, code: '115754 / 118673 / 118225 / 119509 / 123773', kind: 'cover', detail: 'Alternative cover part numbers, depending on finish.' },
  { id: 'pads', name: 'Felt pads', quantity: 4, code: '10002300 / 10050334', kind: 'pad', detail: 'One supplied sheet of four; floor-standing branch only.' },
  { id: 'key', name: 'Hex key', quantity: 1, code: '100001', kind: 'tool', detail: 'Included for the eight long screws.' },
];

const part = (name, quantity, code = null) => ({ name, quantity, code });
const step = (id, title, description, tip, phase, page, manualStep, scene, parts = []) => ({
  id, title, description, tip, phase, page, manualStep, scene, parts,
  officialSource: `${MANUAL}#page=${page}`,
});

const prep = step(
  'prepare', 'A little preparation.',
  'Match your booklet to AA-2703308-1 and count 10 wooden dowels. Lay out the seven panels on a protective surface and assemble with another person.',
  'Have a hammer, flat and cross-head screwdrivers, pencil and spirit level ready. The hex key is included. Wall screws and plugs must suit your wall and are bought separately.',
  'Prepare', 9, 'Before you start', 'overview',
  [part('Panels', 7), part('Wooden dowels', 10, '101339'), part('Long screws', 8, '104321 / 104322')],
);

const body = [
  step('corner', 'Start with one corner.',
    'Join the base panel to the left outer side. Align their factory holes, then tighten two long screws with the hex key.',
    'Work with the cube openings facing upward, as in the manual. Keep the small attachment holes on the inside.',
    'Build', 12, '1', 'corner',
    [part('Base panel', 1), part('Left outer side', 1), part('Long screws', 2, '104321 / 104322')]),
  step('divider-one', 'The short divider goes first.',
    'Insert two wooden dowels at the base connection and slide the first short divider onto them. This becomes the lower central divider.',
    'Choose a SHORT thin panel here. IKEA explicitly crosses out using the full-width middle shelf at this step. Gently tap the dowels as shown.',
    'Build', 13, '2', 'divider1',
    [part('Short divider', 1), part('Wooden dowels', 2, '101339')]),
  step('middle-shelf', 'Add the middle shelf.',
    'Fit two dowels at the end that meets the left side. Slide the full-width middle shelf into place, meeting the end of the first short divider.',
    'This is the long, thin internal panel. The central connection gets its dowels in the next step.',
    'Build', 14, '3', 'middle',
    [part('Full-width middle shelf', 1), part('Wooden dowels', 2, '101339')]),
  step('central-dowels', 'Connect the centre.',
    'Insert two dowels through the centre-face holes of the middle shelf, into the short divider behind it.',
    'Leave the exposed ends ready for the second short divider. These same two dowels form the central connection.',
    'Build', 15, '4', 'centerDowels',
    [part('Wooden dowels', 2, '101339')]),
  step('divider-two', 'Complete the central cross.',
    'Slide the second short divider onto the two exposed centre dowels. This becomes the upper central divider.',
    'The divider edges should meet the middle shelf evenly. Check the official drawing before moving on.',
    'Build', 16, '5', 'divider2',
    [part('Short divider', 1)]),
  step('remaining-dowels', 'Prepare the open edges.',
    'Insert the remaining four dowels: two into the free end of the middle shelf and two into the free end of the upper short divider.',
    'You have now used all 10 dowels: 2 + 2 + 2 + 4. Keep the two sets pointing toward the panels they will meet.',
    'Build', 17, '6', 'outerDowels',
    [part('Wooden dowels', 4, '101339')]),
  step('second-side', 'Fit the other side.',
    'Slide the right outer side onto the exposed dowels at the end of the middle shelf.',
    'Match the orientation detail in the manual: the small attachment holes near the end face the inside of the unit.',
    'Build', 18, '7', 'side',
    [part('Right outer side', 1)]),
  step('close-frame', 'Close the frame.',
    'Fit the final long outer panel over the upper divider dowels. Tighten the six remaining long screws: four at this panel and two at the remaining base corner.',
    'The two screws in the first corner plus these six make eight in total. Have your helper support the frame as you align the final panel.',
    'Build', 19, '8', 'close',
    [part('Top panel', 1), part('Long screws', 6, '104321 / 104322')]),
];

const floor = [
  step('felt-pads', 'Give it a soft landing.',
    'Apply the four felt pads to the outside of the base panel, one near each corner as illustrated. Then raise the unit with your helper.',
    'This is the floor-standing branch. The unit still needs both supplied wall brackets before use.',
    'Anchor', 20, '9', 'pads',
    [part('Felt pads', 4, '10002300 / 10050334')]),
  step('floor-brackets', 'Attach both wall brackets.',
    'Fit one bracket at the rear of each upper outer side. Use two short screws for each bracket, four screws in total.',
    'Tipping can cause serious or fatal crushing injuries. IKEA requires the supplied wall attachment devices for this installation.',
    'Anchor', 21, '10', 'brackets',
    [part('Wall brackets', 2, '115753'), part('Short screws', 4, '100372')]),
  step('floor-mark', 'Mark the wall.',
    'Place the upright unit against the wall. Mark one fixing point through the large opening in each bracket.',
    'Use the actual brackets to locate the holes. The 3D view is illustrative and must not be used as a drilling template.',
    'Anchor', 22, '11', 'mark',
    [part('Pencil', 1)]),
  step('floor-wall-screws', 'Use fixings suited to your wall.',
    'Move the unit aside and install two suitable wall screws at your marks, with plugs where your wall construction requires them.',
    'Wall screws and plugs are not included. IKEA shows a round/pan head and rejects countersunk heads. Ask a professional if you are unsure about your wall or fixings.',
    'Anchor', 23, '12', 'wallScrews',
    [part('Suitable wall screws', 2), part('Wall plugs, if required', 2)]),
  step('floor-secure', 'Secure, tighten, cover.',
    'Engage the two wall screws in the brackets. Add a locking plate beneath each screw head, tighten both screws, then press the covers over the brackets.',
    'Check both fixing points against the manual. A standing frame is only finished once its wall attachments are secure.',
    'Anchor', 24, '13', 'secure',
    [part('Locking plates', 2, '103693'), part('Bracket covers', 2, '115754 / 118673 / 118225 / 119509 / 123773')]),
];

const wall = [
  step('wall-brackets', 'Prepare for wall hanging.',
    'Skip the felt pads. Fit one bracket at the rear of each upper outer side, using two short screws per bracket.',
    'Falling hazard: the wall and fixings must support this wall-hung installation and its load. Confirm suitable wall screws and plugs before continuing; seek professional advice if unsure.',
    'Anchor', 25, '9', 'wallBrackets',
    [part('Wall brackets', 2, '115753'), part('Short screws', 4, '100372')]),
  step('wall-mark', 'Hold, level, mark.',
    'With your helper supporting the unit at its intended height, check the top with a spirit level. Mark one fixing point through each bracket opening.',
    'Keep the unit supported. Locate the fixing points from the real furniture and brackets, never from the model.',
    'Anchor', 26, '10', 'wallMark',
    [part('Pencil', 1), part('Spirit level', 1)]),
  step('wall-wall-screws', 'Install the wall fixings.',
    'Move the unit aside and install two wall screws suitable for the wall construction and the hanging load, with appropriate plugs where required.',
    'The manual does not specify a universal fixing size. Use round/pan heads as pictured; countersunk heads are crossed out.',
    'Anchor', 27, '11', 'wallScrews',
    [part('Suitable wall screws', 2), part('Wall plugs, if required', 2)]),
  step('wall-secure', 'Hang and lock both brackets.',
    'With your helper, engage the brackets on both wall screws. Fit the locking plates, adjust the position as illustrated, tighten both wall screws, then press on the covers.',
    'Keep the unit supported until both fixings are secure. Check alignment and attachment against the final manual drawing before loading it.',
    'Anchor', 28, '12', 'wallSecure',
    [part('Locking plates', 2, '103693'), part('Bracket covers', 2, '115754 / 118673 / 118225 / 119509 / 123773')]),
];

export function getSteps(mode = 'floor') {
  const isWall = mode === 'wall';
  return [prep, ...body, ...(isWall ? wall : floor), step(
    'complete', 'Ready for everyday things.',
    'The frame is assembled and both wall attachments should now be secure. Check every connection before adding your books, baskets or records.',
    isWall
      ? 'IKEA lists a maximum wall-cabinet load of 20 kg; the safe load also depends on the wall material and fixings. Keep the manual with the furniture.'
      : 'IKEA lists 13 kg per shelf and 25 kg on the top. Keep the manual with the furniture.',
    'Finish', isWall ? 28 : 24, 'Final check', 'complete',
  )];
}

export const guide = {
  slug: 'lack', name: 'LACK', subtitle: 'Side table', size: '55 × 55 × 45 cm', finish: 'White', article: '304.499.08',
  productUrl: 'https://www.ikea.com/se/en/p/lack-side-table-white-30449908/',
  manual: 'AA-2606170-1', date: '2025-02-27',
  manuals: [{ id: 'AA-2606170-1', title: 'Assembly and warnings', file: 'lack-AA-2606170-1.pdf', url: 'https://www.ikea.com/se/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf' }],
  note: 'The complete assembly diagram, split into two actions. IKEA’s sheet has no numbered steps.',
  prep: 'Place the tabletop upside down on a soft surface. The diagram shows assembly by hand. Keep each screw and leg straight, using the factory holes.',
  facts: ['Five wooden parts', 'Four threaded screws', 'Assemble by hand'],
  inventory: [
    { name: 'Tabletop', quantity: 1, detail: 'Four factory holes on the underside.' },
    { name: 'Square legs', quantity: 4, detail: 'One threaded connection per leg.' },
    { name: 'Double-ended screws', quantity: 4, code: '115980' },
  ],
  checklist: ['All four legs are attached and seated.', 'The table stands evenly.', 'Keep loads within 10 kg and never sit on the table.'],
  steps: [
    { title: 'Small table. Clear start.', description: 'Check the white 55 × 55 cm LACK and match booklet AA-2606170-1. Lay out the tabletop, four legs and four double-ended screws.', tip: 'Use a soft surface to protect the tabletop. IKEA’s diagram shows hand assembly, with the leg held straight.', phase: 'Prepare', label: 'Prepare', page: 1, sourceLabel: 'Assembly diagram', orientation: '55 × 55 × 45 cm · five wooden parts', parts: [{ name: 'Tabletop', quantity: 1 }, { name: 'Legs', quantity: 4 }, { name: 'Screws', quantity: 4, code: '115980' }] },
    { title: 'Start the four screws.', description: 'Keep the tabletop upside down. Start one double-ended screw by hand in each factory hole on the underside, following the first part of IKEA’s diagram.', tip: 'Keep the screws straight. Leave the other threaded ends available for the legs, as shown in the drawing.', phase: 'Assemble', label: '1', page: 1, sourceLabel: 'Diagram · screw insertion', orientation: 'Tabletop upside down · four connections', parts: [{ name: 'Double-ended screws', quantity: 4, code: '115980' }] },
    { title: 'Turn each leg into place.', description: 'Place a leg over each exposed screw and rotate the whole leg to attach it. Work around all four corners, keeping each leg aligned with its connection.', tip: 'IKEA crosses out pushing a leg sideways. Turn it around the screw axis; do not bend or lever it against the tabletop.', phase: 'Assemble', label: '2', page: 1, sourceLabel: 'Diagram · attach four legs', orientation: 'Turn the legs around the screw axes', parts: [{ name: 'Legs', quantity: 4 }] },
    { title: 'Ready for a little company.', description: 'Turn the assembled table upright. Check that all four legs are seated and that the table stands evenly.', tip: 'The manual specifies a maximum load of 10 kg and says not to sit on the table. Check the fastenings periodically, as IKEA’s product care instructions advise.', phase: 'Finish', label: 'Finish', page: 2, sourceLabel: 'English warnings', orientation: 'Final check · maximum load 10 kg', parts: [] },
  ],
};

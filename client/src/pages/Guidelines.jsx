export default function Guidelines() {
  const qa = [
    ['I lost something. What should I do first?', 'Post a lost report with as many details as possible, then browse found reports. Smart matching will also notify you if a likely match is posted. Check the Security Desk too.'],
    ['I found something. What should I do?', 'Post a found report and, if you can, hand the item to university security or an office and tick the box. Keep one or two identifying details private in the "Private identifying details" field.'],
    ['How does ownership verification work?', 'When someone claims a found item they must describe details that are not in the public post. The finder compares the answer with their private notes before accepting.'],
    ['Is my phone number shown?', 'No. Phone numbers, emails and student IDs are never shown publicly. Communicate through in-app chat.'],
    ['How should we hand over an item?', 'Meet in a public, busy place on campus such as the security desk or library entrance, and never go alone to a secluded spot. Both sides can confirm the handover in the app.'],
    ['What should I never post?', 'Do not publish student IDs, card numbers, documents or other sensitive information. If you find an ID card, describe it generally (e.g. "BRACU ID card") and hand it to security.'],
    ['What if a post looks fake or inappropriate?', 'Use "Report abuse" on the item. Moderators review flagged posts.'],
  ];
  return (
    <>
      <div className="page-title"><div><div className="eyebrow">Help</div><h1>Guidelines &amp; FAQ</h1><p className="muted" style={{ margin: 0 }}>Everything you need to know to recover items safely.</p></div></div>
      <div style={{ maxWidth: 820, marginTop: 12 }}>{qa.map(([q, a]) => <details key={q} className="card"><summary>{q}</summary><p>{a}</p></details>)}</div>
    </>
  );
}

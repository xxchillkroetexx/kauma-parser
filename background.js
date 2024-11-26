messenger.messageDisplayAction.onClicked.addListener((tab) => {
  browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
    if (message) {
      processMessage(message);
    }
  });
});

const processMessage = async (message) => {
  const fullMessage = await browser.messages.getFull(message.id);
  if (fullMessage.parts) {
    for (let part of fullMessage.parts) {
      if (part.body) {
        const startIndex = part.body.indexOf("Aufschlüsselung nach Actions:");
        if (startIndex !== -1) {
          const endIndex = part.body.indexOf("Aufschlüsselung nach Collections:");
          if (endIndex !== -1) {
            const actionSection = part.body.substring(startIndex, endIndex);
            const tableHTML = parseAndGenerateTable(actionSection);
            if (tableHTML) {
              await insertTable(message.id, tableHTML, part.body);
            }
          }
        }
      }
    }
  }
};

const parseAndGenerateTable = (text) => {
  const actionRegex = /(\w+): Laufzeit ([\d.]+) Sek\. \(Faktor ([\d.]+): ([^\)]+)\), (\d+) von (\d+) Testfällen bestehen \(([\d.]+)%\), (\d+) schlagen fehl/g;
  const actions = [];
  let match;

  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({
      action: match[1],
      laufzeit: match[2],
      faktor: match[3],
      status: match[4],
      bestandeneTests: match[5],
      gesamtTests: match[6],
      erfolg: match[7],
      fehler: match[8]
    });
  }

  if (actions.length === 0) return null;

  let table = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
    <tr style="background-color: #f2f2f2;">
      <th style="padding: 8px;">Action</th>
      <th style="padding: 8px;">Laufzeit (Sek.)</th>
      <th style="padding: 8px;">Faktor</th>
      <th style="padding: 8px;">Status</th>
      <th style="padding: 8px;">Tests</th>
      <th style="padding: 8px;">Erfolg</th>
    </tr>`;

  actions.forEach(action => {
    table += `<tr>
      <td style="padding: 8px;">${action.action}</td>
      <td style="padding: 8px;">${action.laufzeit}</td>
      <td style="padding: 8px;">${action.faktor} ${action.status}</td>
      <td style="padding: 8px;">${action.bestandeneTests}/${action.gesamtTests}</td>
      <td style="padding: 8px;">${action.fehler} Fehler</td>
      <td style="padding: 8px;">${action.erfolg}%</td>
    </tr>`;
  });

  table += '</table>';
  return table;
};

const insertTable = async (messageId, tableHTML, originalBody) => {
    try {
        const window = await browser.windows.create({
            url: "/table.html",
            type: "popup",
            width: 800,
            height: 1000
        });
        
        // Warten bis die Seite geladen ist
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Nachricht an das neue Fenster senden
        const response = await browser.tabs.sendMessage(
            window.tabs[0].id,
            {tableHTML: tableHTML}
        );
        
        if (!response) {
            throw new Error("No response from table window");
        }
    } catch (error) {
        console.error("Error displaying table:", error);
    }
};
browser.runtime.onMessage.addListener((message) => {
    document.getElementById('content').innerHTML = message.tableHTML;
    return Promise.resolve({response: "Table updated"});
});
var storedSuggestion = null;
// IPFS Gateway/API, will be updated after reading from storage
var gateway = "https://gateway.ipfs.io/ipfs/";

// Default action
var defaultAction = "search";

function updateOptions() {
    chrome.storage.sync.get({
        defaultAction: "search",
        gateway: "https://gateway.ipfs.io/ipfs/"
    }, function (items) {
        defaultAction = items.defaultAction;
        gateway = items.gateway;
        console.log("defaultAction: " + defaultAction);
    });
}

function goToPage(hash) {
    chrome.tabs.update({
        "url": gateway + hash
    }, function () {
        console.log("Bug Page is open");
    });
}

function standardSearch(text) {
    chrome.tabs.update({
        "url": "https://ipfs-search.com/#/search?search=" + text
    }, function () {
        console.log("Bug Page is open");
    });

}

function querySearch(text) {
    fetch("https://api.ipfs-search.com/v1/search?q=" + encodeURI(text) + "&type=any&page=1", {
            mode: 'cors'
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (myJson) {
            parseSuggestions(myJson, text);
        })
        .catch(function (error) {
            console.log("Error: " + error);
        });
}

function isDefault(text) {
    return text.charAt(text.length - 1) !== " ";
}

function getTrailingText(text) {
    let trailingText = "<dim> | ";

    let useDefault = isDefault(text);

    if (defaultAction === "go") {
        if (useDefault) {
            trailingText += "Jump to Page (Space + Enter to search)";
        } else {
            trailingText += "Search on IPFS";
        }
    } else {
        // Includes both "search" and any unrecognized value

        if (useDefault) {
            trailingText += "Search on IPFS (Space + Enter to jump to page)";
        } else {
            trailingText += "Jump to Page";
        }

        if (defaultAction !== "search") {
            console.log(`Unrecognized action ${defaultAction}.`);
        }
    }

    trailingText += "</dim>";

    return trailingText;
}

function parseSuggestions(jsonResponse, originalText) {
    // Set first suggestion as the default suggestion
    console.log(jsonResponse);
    let hit = jsonResponse.hits[0];
    storedSuggestion = hit.hash;

    let trailingText = getTrailingText(originalText);

    // Chrome only allows one suggestion from an extension
    chrome.omnibox.setDefaultSuggestion({
        description: (hit.title + trailingText)
    });

}

// Fired when the user changes the content of the omnibox
chrome.omnibox.onInputChanged.addListener(
    function (text, suggest) {
        updateOptions();
        console.log("inputChanged: " + text);
        querySearch(text);
    });

// Fired when the user accepts the suggestion
chrome.omnibox.onInputEntered.addListener(
    function (text) {
        if (isDefault(text)) {
            if (defaultAction === "go") {
                goToPage(storedSuggestion, text);
            } else {
                standardSearch(text);
            }

        } else {
            if (defaultAction === "go") {
                standardSearch(text);
            } else {
                goToPage(storedSuggestion, text);
            }
        }
    });

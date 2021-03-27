// Contains the suggestion returned by IPFS Search
var storedSuggestion = null;

// IPFS Gateway/API, will be updated after reading from storage
var gateway = "https://gateway.ipfs.io/ipfs/";

// Default action
var defaultAction = "search";

// Read from the options storage
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

// Jump to suggested URL
function goToPage(hash) {
    chrome.tabs.update({
        "url": gateway + hash
    }, function () {
        console.log("Bug Page is open");
    });
}

// Search on IPFS (default)
function standardSearch(text) {
    chrome.tabs.update({
        "url": "https://ipfs-search.com/#/search?search=" + text
    }, function () {
        console.log("Bug Page is open");
    });

}

// Query the IPFS search API
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

// An action is treated as non-default if its query ends with a space
function isDefault(text) {
    return text.charAt(text.length - 1) !== " ";
}

// Get the text that appears after the suggestion
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

// Handle the suggestion received from the IPFS API
function parseSuggestions(jsonResponse, originalText) {
    // Set first suggestion as the default suggestion
    console.log("Received suggestion response: " + jsonResponse);
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
        if (storedSuggestion == null) {
            // In case of error, fallback to search
            standardSearch(text);
        }
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

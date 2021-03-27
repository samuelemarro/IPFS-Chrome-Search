// Contains the suggestions returned by IPFS Search
var storedSuggestions = [];

// IPFS Gateway/API, will be updated after reading from storage
var gateway = "https://gateway.ipfs.io/ipfs/";

// Default action
var defaultAction = "search";

// Cache size
var cacheSize = 100;

// Read from the options storage
function updateOptions() {
    chrome.storage.sync.get({
        defaultAction: "search",
        gateway: "https://gateway.ipfs.io/ipfs/",
        cacheSize: 100
    }, function (items) {
        defaultAction = items.defaultAction;
        gateway = items.gateway;
        cacheSize = items.cacheSize;
    });
}

// Jump to suggested URL
function goToPage(hash) {
    let jumpGateway = gateway;
    if (jumpGateway[jumpGateway.length - 1] != "/") {
        jumpGateway += "/";
    }
    let jumpURL = jumpGateway + hash;
    chrome.tabs.update(null, {
        "url": jumpURL
    }, function () {
        console.log("Executing jump to " + jumpURL);
    });
}

// Search on IPFS (default)
function standardSearch(text) {
    let searchURL = "https://ipfs-search.com/#/search?search=" + text;
    chrome.tabs.update({
        "url": searchURL
    }, function () {
        console.log("Executing search: " + searchURL);
    });

}

// Query the IPFS search API
function querySearch(text) {
    let cachedSuggestion = getCachedSuggestion(text);
    if (cachedSuggestion == null) {
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
    } else {
        setDefaultSuggestion(cachedSuggestion.title, text);
    }
}

function getCachedSuggestion(text) {
    text = text.trim();

    let result = storedSuggestions.find((el) => el.key == text);
    if (result == undefined) {
        return null;
    }
    return result.value;
}

function setDefaultSuggestion(title, originalText) {
    let trailingText = getTrailingText(originalText);

    // Chrome only allows one suggestion from an extension
    chrome.omnibox.setDefaultSuggestion({
        description: (title + trailingText)
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
    let cachedSuggestion = getCachedSuggestion(text);

    if (defaultAction === "go") {
        if (!useDefault || cachedSuggestion == null) {
            trailingText += "Search on IPFS";
        } else {
            trailingText += "Jump to Page (Space + Enter to search)";
        }
    } else {
        // Includes both "search" and any unrecognized value

        if (useDefault || cachedSuggestion == null) {
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

    if (storedSuggestions.length > cacheSize) {
        storedSuggestions.shift();
    }
    storedSuggestions.push({
        key: originalText,
        value: {
            title: hit.title,
            hash: hit.hash
        }
    });

    setDefaultSuggestion(hit.title, originalText);

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
        let cachedSuggestion = getCachedSuggestion(text);
        if (cachedSuggestion == null) {
            // In case of error, fall back to search
            standardSearch(text);
            return;
        }
        if (isDefault(text)) {
            if (defaultAction === "go") {
                goToPage(cachedSuggestion.hash, text);
            } else {
                standardSearch(text);
            }

        } else {
            if (defaultAction === "go") {
                standardSearch(text);
            } else {
                goToPage(cachedSuggestion.hash, text);
            }
        }
    });

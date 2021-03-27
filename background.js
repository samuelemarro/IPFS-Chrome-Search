// Contains the suggestions returned by IPFS Search
var storedSuggestions = [];

// IPFS Gateway/API, will be updated after reading from storage
var gateway = "https://gateway.ipfs.io/ipfs/";

// Default action
var defaultAction = "search";

// Cache size
var cacheSize = 100;

// Latest omnibox text
var omniboxText = "";

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
        // If the user hasn't already inserted another query, provide
        // the suggestion
        if (omniboxText == text) {
            setDefaultSuggestion(cachedSuggestion.title, text);
        }
        
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

// Sets the default suggestion for the Omnibox
function setDefaultSuggestion(title, originalText) {
    let suggestionText = "";
    let useDefault = isDefault(originalText);
    let cachedSuggestion = getCachedSuggestion(originalText);
    let foundResult = (cachedSuggestion != null) && (title != null);

    if (foundResult) {
        suggestionText += title;
    }
    suggestionText += "<dim>";
    
    if (foundResult) {
        suggestionText += " | "
    }

    if (defaultAction === "go") {
        if (!useDefault || !foundResult) {
            suggestionText += "Search on IPFS";
        } else {
            suggestionText += "Jump to Page (Space + Enter to search)";
        }
    } else {
        // Includes both "search" and any unrecognized value

        if (useDefault || !foundResult) {
            suggestionText += "Search on IPFS (Space + Enter to jump to page)";
        } else {
            suggestionText += "Jump to Page";
        }

        if (defaultAction !== "search") {
            console.log(`Unrecognized action ${defaultAction}.`);
        }
    }

    suggestionText += "</dim>";

    // Chrome only allows one suggestion from an extension
    chrome.omnibox.setDefaultSuggestion({
        description: (suggestionText)
    });
}

// An action is treated as non-default if its query ends with a space
function isDefault(text) {
    return text.charAt(text.length - 1) !== " ";
}

// Handle the suggestion received from the IPFS API
function parseSuggestions(jsonResponse, originalText) {
    // Set first suggestion as the default suggestion
    console.log("Received suggestion response: " + jsonResponse);
    let hit = jsonResponse.hits[0];

    if (hit != null) {
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
    }

    // If the user hasn't already inserted another query, provide
    // the suggestion
    if (omniboxText == originalText) {
        setDefaultSuggestion(hit == null ? null : hit.title, originalText);
    }
}

// Fired when the user changes the content of the omnibox
chrome.omnibox.onInputChanged.addListener(
    function (text, suggest) {
        updateOptions();
        omniboxText = text;
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

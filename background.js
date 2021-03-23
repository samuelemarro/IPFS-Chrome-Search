// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
storedSuggestion = null

function goToPage(hash) {
  chrome.tabs.update({
    "url": "https://gateway.ipfs.io/ipfs/" + hash
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
  fetch("https://api.ipfs-search.com/v1/search?q=" + encodeURI(text) + "&type=any&page=1")
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

function parseSuggestions(jsonResponse, originalText) {
  // Set first suggestion as the default suggestion
  console.log(jsonResponse);
  hit = jsonResponse.hits[0]
  storedSuggestion = hit.hash;

  if (originalText.charAt(originalText.length - 1) === " ") {
    trailingText = " | Jump to Page"
  }
  else {
    trailingText = " | Search on IPFS (Space + Enter to jump to page)"
  }

  chrome.omnibox.setDefaultSuggestion({description:(hit.title + trailingText)});

}

// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    storedSuggestions = {}
    console.log('inputChanged: ' + text);
    querySearch(text);
    });

// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(
  function(text) {
    if (text.charAt(text.length - 1) === " ") {
      goToPage(storedSuggestion, text);
    }
    else {
      standardSearch(text);
    }
  });

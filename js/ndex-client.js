var NdexClient =
{
    //NdexServerURI: "http://localhost:8080/ndexbio-rest",
    NdexServerURI: "http://test.ndexbio.org/rest/ndexbio-rest",

    /****************************************************************************
     * Initialization of the client.
     ****************************************************************************/
    _init: function () {

       // if (location.hostname.toLowerCase() != "localhost")
       //     this.NdexServerURI = "/rest/ndexbio-rest";
    },

    /****************************************************************************
     * Default error handling.
     ****************************************************************************/
    errorHandler: function (jqXHR, textStatus, errorThrown) {
        if (arguments.length >= 3)
            $.gritter.add({ title: errorThrown, text: jqXHR.responseText });
        else if (arguments.length === 1)
            $.gritter.add({ title: "Oops", text: exception });
        else
            $.gritter.add({ title: "Oops", text: "Something went wrong and we haven't figured this one out yet!" });
    },

    /****************************************************************************
     * AJAX DELETE request.
     ****************************************************************************/
    delete: function (url, callback, errorHandler) {
        $.ajax(
            {
                type: "DELETE",
                url: NdexClient.NdexServerURI + url,
                dataType: "JSON",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + NdexClient.getEncodedUser());
                },
                success: callback,
                error: errorHandler || NdexClient.errorHandler
            });
    },

    /****************************************************************************
     * AJAX GET request.
     ****************************************************************************/
    get: function (url, queryArgs, callback, errorHandler) {
        $.ajax(
            {
                type: "GET",
                url: NdexClient.NdexServerURI + url,
                data: queryArgs,
                dataType: "JSON",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + NdexClient.getEncodedUser());
                },
                success: callback,
                error: errorHandler || NdexClient.errorHandler
            });
    },

    // GET request configuration for angular $http
    getGetConfig: function(url, queryArgs){
        var config ={
            method: 'GET',
            url: NdexClient.NdexServerURI + url,
            headers: {
                Authorization: "Basic " + NdexClient.getEncodedUser()
            }
        }
        if (queryArgs){
            config.data =  JSON.stringify(queryArgs);
        }
        return config;
    },

    /****************************************************************************
     * AJAX POST request.
     ****************************************************************************/
    post: function (url, postData, callback, errorHandler) {
        $.ajax(
            {
                type: "POST",
                url: NdexClient.NdexServerURI + url,
                data: JSON.stringify(postData),
                dataType: "JSON",
                contentType: 'application/json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + NdexClient.getEncodedUser());
                },
                success: callback,
                error: errorHandler || NdexClient.errorHandler
            });
    },

    getPostConfig: function(url, postData){
        var config ={
            method: 'POST',
            url: NdexClient.NdexServerURI + url,
            data: JSON.stringify(postData),
            headers: {
                Authorization: "Basic " + NdexClient.getEncodedUser()
            }
        }
          return config;
    },

    /****************************************************************************
     * AJAX PUT request.
     ****************************************************************************/
    put: function (url, putData, callback, errorHandler) {
        $.ajax(
            {
                type: "PUT",
                url: NdexClient.NdexServerURI + url,
                contentType: "application/json",
                data: JSON.stringify(putData),
                dataType: "JSON",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + NdexClient.getEncodedUser());
                },
                success: callback,
                error: errorHandler || NdexClient.errorHandler
            });
    },

    /****************************************************************************
     * Logs the user out of the system.
     ****************************************************************************/
    signOut: function () {
        delete localStorage.username;
        delete localStorage.password;
        delete localStorage.userId;



        //if (localStorage["Groups Search"]) delete localStorage["Groups Search"];
        //if (localStorage["Users Search"]) delete localStorage["Users Search"];
        //if (localStorage["Networks Search"]) delete localStorage["Networks Search"];

    },

    /****************************************************************************
     * Submits the user's credentials to the server for authentication.
     ****************************************************************************/
    submitCredentials: function (username, password, successAction) {

        if (typeof(localStorage) === "undefined") {
            $.gritter.add({ title: "Unsupported Browser", text: "Your browser isn't supported; you'll need to upgrade it to use this site." });
            return;
        }

        if (!username || !password) {
            $.gritter.add({ title: "Invalid Input", text: "username and password are required." });
            return;
        }

        delete localStorage.username;
        delete localStorage.password;
        delete localStorage.userId;

        console.log("username = " + username + " password = " + password);

        this.get(
            "/users/authenticate/" + encodeURIComponent(username) + "/" + encodeURIComponent(password),
            null,
            function (userData) {
                //TODO: Need to create an unsupported page to let the user know they need to upgrade their browser
                if (userData) {
                    localStorage.username = userData.username;
                    localStorage.password = password;
                    localStorage.userId = userData.id;
                    successAction();
                }
                else
                    $.gritter.add({ title: "Server Error", text: "An error occurred during authentication." });
            },
            function () {
                $.gritter.add({ title: "Unauthorized", text: "Invalid username or password." });
            }
        );

    },

    submitNetworkSearch: function(searchType, searchString, message, networkSearchResults){
        console.log("About to post search: " + searchType + "  " + searchString);
        this.post(
            "/networks/search/" + searchType,
            {
                    searchString: searchString,
                    top: 100,
                    skip: 0
            },
            function (networks) {
                if (networks) {
                    console.log("Search found: " + networks.length + " networks ");
                    networkSearchResults = networks;
                    console.log("Set networkSearchResults");
                    console.log("first network name = " + networks[0].name);
                    message = "first network name = " + networks[0].name;
                }
                else
                    $.gritter.add({ title: "Search Failure", text: "No networks found" });
            },
            function () {
                $.gritter.add({ title: "Search Error", text: "Error in network search" });
            }
        );

    },

    getNetworkSearchConfig: function(searchType, searchString){
        var url = "/networks/search/" + searchType;
        var postData = {
                searchString: searchString,
                top: 100,
                skip: 0
            };
        return this.getPostConfig(url, postData);
    },

    getNetworkQueryByEdgesConfig: function(networkId, blockSize, skipBlocks){
        // networks/{networkId}/edges/{skip}/{top}
        var url = "/networks/" + networkId + "/edges/" + skipBlocks + "/" + blockSize;
        return this.getGetConfig(url, null);
    },

    /****************************************************************************
     * Loads the information of the currently-logged in user.
     ****************************************************************************/
    loadUser: function () {
        if (!localStorage.userId)
            return;

        this.get(
            "/users/" + localStorage.userId,
            null,
            function (userData) {
                this.currentUser = userData;
                this.userId = this.currentUser.id;
            },
            this.errorHandler
        );
    },


    /****************************************************************************
     * Returns the user's credentials as required by Basic Authentication base64
     * encoded.
     ****************************************************************************/
    getEncodedUser: function () {
        if (localStorage.userId)
            return btoa(localStorage.username + ":" + localStorage.password);
        else
            return null;
    },



    getNodeLabel: function(node, network) {
        if ("name" in node && node.name && node.name != "")
            return node.name;
        else if ("represents" in node && node.represents)
            return this.getTermLabel(network.terms[node.represents], network);
        else
            return "unknown"
    },

/****************************************************************************
 * Builds a term label based on the term type; labels rely on Base Terms,
 * which have names and namespaces. Function Terms can refer to other
 * Function Terms or Base Terms, and as such must be traversed until a Base
 * Term is reached.
 ****************************************************************************/
    getTermLabel: function(term, network) {
        if (term.termType === "Base") {
            if (term.namespace) {
                var namespace = network.namespaces[term.namespace];

                if (!namespace || namespace.prefix === "LOCAL")
                    return term.name;
                else if (!namespace.prefix)
                    return namespace.uri + term.name;
                else
                    return namespace.prefix + ":" + term.name;
            }
            else
                return term.name;
        }
        else if (term.termType === "Function") {
            var functionTerm = network.terms[term.termFunction];
            if (!functionTerm) {
                console.log("no functionTerm by id " + term.termFunction);
                return;
            }

            var functionLabel = this.getTermLabel(functionTerm, network);
            functionLabel = this.lookupFunctionAbbreviation(functionLabel);

            var sortedParameters = this.getDictionaryKeysSorted(term.parameters);
            var parameterList = [];

            for (var parameterIndex = 0; parameterIndex < sortedParameters.length; parameterIndex++) {
                var parameterId = term.parameters[sortedParameters[parameterIndex]];
                var parameterTerm = network.terms[parameterId];

                if (parameterTerm)
                    var parameterLabel = NdexHelpers.getTermLabel(parameterTerm, network);
                else
                    console.log("no parameterTerm by id " + parameterId);

                parameterList.push(parameterLabel);
            }

            return functionLabel + "(" + parameterList.join(", ") + ")";
        }
        else
            return "Unknown";
    },

/****************************************************************************
 * Looks-up abbreviations for term functions.
 ****************************************************************************/
    lookupFunctionAbbreviation: function(functionLabel) {
        var fl = functionLabel.toLowerCase();
        switch (fl) {
            case "bel:abundance":
                return "a";
            case "bel:biological_process":
                return "bp";
            case "bel:catalytic_activity":
                return "cat";
            case "bel:complex_abundance":
                return "complex";
            case "bel:pathology":
                return "path";
            case "bel:peptidase_activity":
                return "pep";
            case "bel:protein_abundance":
                return "p";
            case "bel:rna_abundance":
                return "r";
            case "bel:protein_modification":
                return "pmod";
            case "bel:transcriptional_activity":
                return "trans";
            case "bel:molecular_activity":
                return "act";
            case "bel:degredation":
                return "deg";
            case "bel:kinase_activity":
                return "kin";
            default:
                if (fl.match(/^bel:/))
                    return functionLabel.toLowerCase().replace(/^bel:/, '');
                else
                    return functionLabel;
        }
    }
}

$(document).ready(function () {
    NdexClient._init();
});

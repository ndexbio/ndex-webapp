var NdexClient =
{
    NdexServerURI: "http://localhost:8080/ndexbio-rest",
    //NdexServerURI: "http://test.ndexbio.org/rest/ndexbio-rest",

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

    getDeleteConfig: function(url) {
        var config ={
            method: 'DELETE',
            url: NdexClient.NdexServerURI + url,
            headers: {
                Authorization: "Basic " + NdexClient.getEncodedUser()
            }
        }
        return config;
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

    getPutConfig: function(url, putData){
        var config ={
            method: 'PUT',
            url: NdexClient.NdexServerURI + url,
            data: JSON.stringify(putData),
            headers: {
                Authorization: "Basic " + NdexClient.getEncodedUser()
            }
        }
        return config;
    },

    /****************************************************************************
     * Logs the user out of the system.
     ****************************************************************************/
    clearUserCredentials: function () {
        if (this.checkLocalStorage()){
            delete localStorage.username;
            delete localStorage.password;
            delete localStorage.userId;
        }
        //if (localStorage["Groups Search"]) delete localStorage["Groups Search"];
        //if (localStorage["Users Search"]) delete localStorage["Users Search"];
        //if (localStorage["Networks Search"]) delete localStorage["Networks Search"];

    },

    checkLocalStorage: function(){
        if (localStorage == undefined) return false;
        return true;
    },

    setUserCredentials: function(userData, password){
        localStorage.username = userData.username;
        localStorage.password = password;
        localStorage.userId = userData.id;
    },

    getSubmitUserCredentialsConfig: function (username, password){
        var url = "/users/authenticate/" + encodeURIComponent(username) + "/" + encodeURIComponent(password);
        return this.getGetConfig(url);
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

    getNetworkConfig: function(networkId){
        // networks/{networkId}
        var url = "/networks/" + networkId ;
        return this.getGetConfig(url, null);
    },

    getNetworkQueryByEdgesConfig: function(networkId, blockSize, skipBlocks){
        // networks/{networkId}/edges/{skip}/{top}
        var url = "/networks/" + networkId + "/edges/" + skipBlocks + "/" + blockSize;
        return this.getGetConfig(url, null);
    },

    getNetworkQueryConfig: function(networkId, startingTerms, searchType, searchDepth){
        console.log("searchType = " + searchType);
        console.log("searchDepth = " + searchDepth);
        for (index in startingTerms){
            console.log("searchTerm " + index + " : " + startingTerms[index]);
        }
        var url = "/networks/" + networkId + "/query";
        var postData = {
            startingTermStrings: startingTerms,
            searchType: searchType,
            searchDepth: searchDepth
        };
        return this.getPostConfig(url, postData);
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

    /****************************************************************************
     * Determines if the user has write-access to the network.
     ****************************************************************************/
    canEdit: function(currentNetwork)
    {
        if (!currentNetwork || !this.currentUser) return false;
        for (var networkIndex = 0; networkIndex < this.currentUser.networks().length; networkIndex++)
        {
            var network = this.currentUser.networks()[networkIndex];
            if (network.resourceId() === currentNetwork.id() && network.permissions() != "READ")
                return true;
        }

        return false;
    },



    hasFormat: function(format){
        // take dublin core annotation as first priority
        var currentFormat = Network.ViewModel.Network().metadata.get('dc:format')();
        // otherwise, take simple "Format"
        if (!currentFormat){
            currentFormat = Network.ViewModel.Network().metadata.get('Format')();
        }
        if (!currentFormat) return false;
        if (currentFormat === format) return true;
        return false;
    },


    /****************************************************************************
     * create a nice label for a node
     ****************************************************************************/
    updateNodeLabels: function(nodeLabelMap, network){
        $.each(network.nodes, function (id, node){
            nodeLabelMap[id] = NdexClient.getNodeLabel(node, network) ;
        });
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

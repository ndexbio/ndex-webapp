/**
 * Created by dwelker on 6/11/15.
 */
//The point of this file is to provide initialization, especially for cross-browswer compatibility.

//For Safari...
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (typeof(Triptych) === 'undefined') Triptych = {};

Triptych.CanvasEnabled = false;
Triptych.WebGLEnabled = false;

Triptych.checkRenderingStatus = function(){
    if (!!window.CanvasRenderingContext2D){
        Triptych.CanvasEnabled = true;
    } else {
        Triptych.CanvasEnabled = false;
    }

    if ((function ()
    {
        try
        {
            return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
        }
        catch (e)
        {
            return false;
        }
    })())
    {
        Triptych.WebGLEnabled = true;
    } else {
        Triptych.WebGLEnabled = false;
    }
}



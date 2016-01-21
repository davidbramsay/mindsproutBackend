import numpy as np
import wave
import struct
from scipy import signal


def static_vars(**kwargs):
    def decorate(func):
        for k in kwargs:
            setattr(func, k, kwargs[k])
        return func
    return decorate


def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return izip_longest(*args, fillvalue=fillvalue)


def chunk(iterable, n, overlap):
    return [iterable[base:base+n] for base in range(0, len(iterable), n-overlap)]


def wavSamples(wave_file):
    # read full wave file back as a float numpy array, each index is a channel
    w = wave.open(wave_file, 'r')
    astr = w.readframes(w.getnframes())
    # convert binary chunks to short
    a = struct.unpack("%ih" % (w.getnframes()* w.getnchannels()), astr)
    a = [float(val) / pow(2, 15) for val in a]
    
    anew = []
    for ind in range(w.getnchannels()):
        anew.append(a[ind::w.getnchannels()])
    
    return np.array(anew)


@static_vars(w = None, chunk=44100, overlap=0, name="")
def wavSamplesNextFrame(wavFile=None, chunk=None, overlap=None):
    #read a frame from wave file back as float numpy array, each index is a channel
    #can give chunk/overlap/wavfile name on first call and all is stored in function
    if wavSamplesNextFrame.w is None:
        if wavFile is None:
            sys.exit( "ERROR: must specify WAV FILE!!" )
            return
        wavSamplesNextFrame.w = wave.open(wavFile, 'r')
        wavSamplesNextFrame.name = wavFile
    if wavFile is not None:
        if (wavFile != wavSamplesNextFrame.name):
            wavSamplesNextFrame.w.close()
            wavSamplesNextFrame.w = wave.open(wavFile, 'r')
            wavSamplesNextFrame.name = wavFile
    if chunk is not None:
        wavSamplesNextFrame.chunk = chunk
    if overlap is not None:
        wavSamplesNextFrame.overlap = overlap
    #set pointer to wav based on overlap
    currentPos = wavSamplesNextFrame.w.tell()
    if (currentPos > wavSamplesNextFrame.overlap):
        wavSamplesNextFrame.w.setpos(currentPos - wavSamplesNextFrame.overlap)
    #read chunk as string
    astr = wavSamplesNextFrame.w.readframes(wavSamplesNextFrame.chunk)
    # convert binary chunks to short
    a = struct.unpack("%ih" % (wavSamplesNextFrame.chunk* wavSamplesNextFrame.w.getnchannels()), astr)
    a = [float(val) / pow(2, 15) for val in a]
    #make into numpy array by channel
    anew = []
    for ind in range(wavSamplesNextFrame.w.getnchannels()):
        anew.append(a[ind::wavSamplesNextFrame.w.getnchannels()])
    
    return np.array(anew)


def voiceBPFilter(audioArray, fs=44100, lowf=60.0, highf=4000.0, order=5):
    b, a = butter_bandpass(lowf, highf, fs, order=order)
    if isinstance(audioArray[0], (list, tuple, np.ndarray)):
        for audio in audioArray:
            y.append(signal.lfilter(b, a, audio))
    else:
        y = signal.lfilter(b, a, audioArray)
    return y


def normalize(audioArray):
    normAudio = []
    maxVal = np.max(abs(audioArray))
    if isinstance(audioArray[0], (list, tuple, np.ndarray)):
        for audio in audioArray:
            normAudio.append(audio/float(maxVal))
    else:
        normAudio = (audioArray/float(maxVal))
    return normAudio


def peakDetect(v, delta, x = None):
    #returns object with [0]=maxind,[1]=maxval,[2]=minind,[3]=minval
    maxtab = []
    mintab = []
    
    if x is None:
        x = np.arange(len(v))
    v = np.asarray(v)
    if len(v) != len(x):
        sys.exit('Input vectors v and x must have same length')
    if not np.isscalar(delta):
        sys.exit('Input argument delta must be a scalar')
    if delta <= 0:
        sys.exit('Input argument delta must be positive')
    
    mn, mx = np.Inf, -np.Inf
    mnpos, mxpos = np.NaN, np.NaN

    lookformax = True
    
    for i in np.arange(len(v)):
        this = v[i]
        if this > mx:
            mx = this
            mxpos = x[i]
        if this < mn:
            mn = this
            mnpos = x[i]
        
        if lookformax:
            if this < mx-delta:
                maxtab.append((mxpos, mx))
                mn = this
                mnpos = x[i]
                lookformax = False
        else:
            if this > mn+delta:
                mintab.append((mnpos, mn))
                mx = this
                mxpos = x[i]
                lookformax = True

    xmax = [m[0] for m in maxtab]
    ymax = [m[1] for m in maxtab]
    xmin = [m[0] for m in mintab]
    ymin = [m[1] for m in mintab]
    


    return np.array(xmax), np.array(ymax), np.array(xmin), np.array(ymin)

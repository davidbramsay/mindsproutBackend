import pciSpeechTools.speechHelperFunctions as sh
import numpy as np
from scipy import signal


def findSilence(audioArray, fs=44100.0, thresh= 0.1):
    # return 0 or 1 to see if env of signal is above silence thresh
    # (look only in the speak range in the future - BPF perhaps?)
    # assumed that audioArray and thresh are normalized beforehand
    silence = []
    if isinstance(audioArray[0], (list, tuple, np.ndarray)):
        for audio in audioArray:
            h = signal.hilbert(audio)
            env = ((audio ** 2 + h ** 2) ** 0.5 )
            silence.append(env<thresh)
    else:
        h = signal.hilbert(audioArray)
        env = ((audioArray ** 2 + h ** 2) ** 0.5 )
        silence = (env<thresh)
    return silence


def silenceStatistics(audioArray, fs=44100.0, thresh=0.1, minTime=0.5):
    #calc statistics about pauses given silence threshold and minimum time that counts as a pause
    #num pauses total, num pauses per min, average length of pause, longest pause, shortest pause, stddev of pauses
    returnArray = []

    minSamples = round(fs*minTime)
    silence = findSilence(audioArray, fs=fs, thresh=thresh)
    if isinstance(silence[0], (list, tuple, np.ndarray)):
        for ind, sil in enumerate(silence):
            counter = 0
            silenceArray = []
            for sample in sil:
                if sample:
                    counter = counter + 1
                else:
                    if (counter>=minSamples):
                        silenceArray.append( counter/float(fs) )
                    counter = 0

            returnArray.append({'dataLabel': 'avgLength', 'dataValue': float(np.mean(silenceArray)),'dataUnits': 'sec'})
            returnArray.append({'dataLabel': 'numSilences', 'dataValue': int(len(silenceArray)),'dataUnits': 'count'})
            returnArray.append({'dataLabel': 'avgNumSilencesPerMin', 'dataValue': float(60*(len(silenceArray) / (len(sil)/float(fs)))),'dataUnits': 'count'})
            returnArray.append({'dataLabel': 'longestSilence', 'dataValue': float(np.max(silenceArray)),'dataUnits': 'sec'})
            returnArray.append({'dataLabel': 'shortestSilence', 'dataValue': float(np.min(silenceArray)),'dataUnits': 'sec'})
    else:
        counter = 0
        silenceArray = []
        for sample in silence:
            if sample:
                counter = counter + 1
            else:
                if (counter>=minSamples):
                    silenceArray.append( counter/float(fs) )
                counter = 0

        returnArray.append({'dataLabel': 'avgLength', 'dataValue': float(np.mean(silenceArray)),'dataUnits': 'sec'})
        returnArray.append({'dataLabel': 'numSilences', 'dataValue': int(len(silenceArray)),'dataUnits': 'count'})
        returnArray.append({'dataLabel': 'avgNumSilencesPerMin', 'dataValue': float(60*(len(silenceArray) / (len(silence)/float(fs)))),'dataUnits': 'count'})
        returnArray.append({'dataLabel': 'longestSilence', 'dataValue': float(np.max(silenceArray)),'dataUnits': 'sec'})
        returnArray.append({'dataLabel': 'shortestSilence', 'dataValue': float(np.min(silenceArray)),'dataUnits': 'sec'})

    return returnArray

def process(user_id, audioFile):

    temp = sh.wavSamples(audioFile)
    silenceThreshold = 0.03
    return silenceStatistics(temp, fs=44100, thresh=silenceThreshold, minTime=1)


if __name__ == '__main__':
    print process('i','../../audioUploads/emily.wav')

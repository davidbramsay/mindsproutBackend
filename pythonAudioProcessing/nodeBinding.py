import pciSpeechTools.silence as silence
import time
import zerorpc

#expose interface for node to call python code
class audioInterface(object):

    #run all scripts on all files in folder, update mongodb, return true when finished
    def processAllFiles(self, folder):
        return True

    #run all scripts on given file, update mongodb, return all metadata
    def processFile(self, filepath):
        return filepath

    #run a script on given file, update mongodb, return metadata AND next script to run.
    #call with nothing initiates first script, until returns 'null' after stepping through all scripts
    def processNext(self, user_id, filepath, current="silence"):
        return filepath, current

    #analyze silence of given audio file, update mongodb, and return results
    def processSilence(self, user_id, filepath):
        returnVal = silence.process(user_id, filepath)
        return returnVal

    #analyze silence of given audio file, update mongodb, and return results
    def processVolume(self, user_id, filepath):
        returnVal = volume.process(user_id, filepath)
        return returnVal

    #analyze silence of given audio file, update mongodb, and return results
    def processIntonation(self, user_id, filepath):
        returnVal = intonation.process(user_id, filepath)
        return returnVal

    #analyze silence of given audio file, update mongodb, and return results
    def processWordsSpoken(self, user_id, filepath):
        returnVal = wordsspoken.process(user_id, filepath)
        return returnVal

    #check ZMQ link is function properly and we are getting round-trip comm
    def verifyLink(self, returnString):
        return "roundtrip test: {0}".format(returnString)

    #test timeout by waiting 1 minute and returning
    def testTimeout(self):
        time.sleep(120);
        return "finished timeout test"

"""
potential future:
    return audio waveform shape for plotting
    stream back processing as it happens frame-by-frame

nice to have process for full .wav and frameProcess, with state, and a mediation function that
can load/chop the wav file into frames and will take an array of functions as an argument
(each function is processed in parallel in a frame-by-frame way, simply called on each frame in mediation function)

database file: update metadata and pull previous metadata of some/all types for a user from mongo
file for each type of processing
file for support functions
"""

def main():
    s = zerorpc.Server(audioInterface())
    s.bind("tcp://*:4242")
    s.run()

if __name__ == "__main__" : main()

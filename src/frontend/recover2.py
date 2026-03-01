import dbm
import shelve

print(dbm.whichdb('../paronly'))

try:
    with shelve.open('../paronly', flag='c') as db:
        print(len(db))
        # this will probably crash
        keys = list(db.keys())
        print(len(keys))
except Exception as e:
    print("Crash:", e)


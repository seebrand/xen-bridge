import dbm.ndbm

db = dbm.ndbm.open('../paronly', 'r')
try:
    k = db.firstkey()
    while k is not None:
        try:
            print(len(k))
        except Exception as e:
            print("Error on key:", e)
        k = db.nextkey(k)
except Exception as e:
    print("Error during iteration:", type(e), e)

// Tests whether a Replica Set in a mongos cluster can cause versioning problems

jsTestLog( "Starting sharded cluster..." )

var st = new ShardingTest( { shards : 1, mongos : 2, other : { rs : true } } )

var mongosA = st.s0
var mongosB = st.s1
var shard = st.shard0

var sadmin = shard.getDB( "admin" )
assert.throws(function() { sadmin.runCommand({ replSetStepDown : 3000, force : true }); });
try { sadmin.getLastError(); } catch (e) { print("reconnecting: "+e); }

st.rs0.getMaster();

coll = mongosA.getCollection( jsTestName() + ".coll" );
iterations = 0;

// sleep a bit to let servers allocate journals
sleep(30);

// make sure there is a master
assert.soon(
    function(z){
        iterations++;
        try {
            coll.findOne();
            return true;
        }
        catch ( e ){
            return false;
        }
    } );

mongosA.getDB("admin").runCommand({ setParameter : 1, traceExceptions : true })

start = new Date();

// make sure there is a master
assert.soon(
    function(z){
        iterations++;
        try {
            coll.findOne();
            return true;
        }
        catch ( e ){
            return false;
        }
    } );

printjson( coll.findOne() )

end = new Date();

mongosA.getDB("admin").runCommand({ setParameter : 1, traceExceptions : false })

print( "time to work for primary: " + ( ( end.getTime() - start.getTime() ) / 1000 ) + " seconds" );

// not sure how long it takes to elect primary, seen it as low as 2
//assert.gt( 2 , iterations );

// now check secondary

assert.throws(function() { sadmin.runCommand({ replSetStepDown : 3000, force : true }); });
try { sadmin.getLastError(); } catch (e) { print("reconnecting: "+e); }

other = new Mongo( mongosA.host );
other.setSlaveOk( true );
other = other.getCollection( jsTestName() + ".coll" );

print( "eliot: " + tojson( other.findOne() ) );



st.stop()

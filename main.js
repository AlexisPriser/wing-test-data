const axios =require('axios');
const url = 'https://random.justyy.workers.dev/api/random/?cached&n=15';
const items= require('./items.json');
const orders= require('./orders.json');

const parcels=new Array();// store parcels

var packing=0;// increment for each parcel packed
var palette=0;// increment past every 15 packings
var exit=0;// is set to 1 if the parcel gets stored because its weight is above 30
var lastOrderId="";// when order change but last order's parcel gets stored
var limit=orders.orders.length-1;// store it if i need to do test in smaller samples

var test=0;// allow to know in which way the parcel is getting memorised
var lastAdd=0;// last weight added

var p_weight=0;// parcel weight
var remuneration=0;

const parcel={// json for parcel
    orderId:"",
    items:[],
    weight:"",
    trackingId:"",
    paletteNumber:0,
};
const p_item={// json for parcel items
    item_id:"",
    quantity:0
}

const getTrackId=(callback)=>{
axios.get(url)
  .then(function(html){
    //success!
    return callback(html.data);
  })
  .catch(function(err){
    //handle error
  });
}

const packingUp=async (parcel,s,OrderId)=>{
    // packing-up

    if(packing%15==0){
    palette++;
    }
    packing++;

    if(OrderId!==""){
    parcel.orderId=OrderId;
    }else{
    parcel.orderId=s.id;
    }

    parcel.trackingId=await new Promise(resolve => getTrackId(resolve));
    parcel.weight=p_weight.toFixed(1);
    parcel.paletteNumber=palette;
    parcels.push({...parcel});// send a duplicate
    parcel.items=[];
    parcel.trackingId="";
    parcel.paletteNumber=0;

    // remuneration
    if(p_weight=>0 && p_weight<1){
        remuneration+=1;
    }
    if(p_weight=>1 && p_weight<5){
        remuneration+=2;
    }
    if(p_weight=>5 && p_weight<10){
        remuneration+=3;
    }
    if(p_weight=>10 && p_weight<20){
        remuneration+=5;
    }
    if(p_weight=>20){
        remuneration+=10;
    }

    return;
}

const dropshipment = async()=>{// this function can takes a very long time to be fully executed
    
    var Orders=orders.orders;
    var i=0;
    limit=Orders.length;

    for(i=0;i<limit;i++){

    var s=Orders[i];// scan orders as s

        for(var ii=0;ii<s.items.length;ii++){// scan first order as ss
        const ss=s.items[ii];

            for(var iii=0;iii<items.items.length;iii++){// scan items in item list as s_item
            const s_item=items.items[iii];
                if(ss.item_id===s_item.id){// when item match between order and list
                    
                    var add=parseFloat(s_item.weight);

                    var n_item=0;
                    exit=0;
                    
                    for(var fi=0;fi<ss.quantity;fi++)// individualy check each items, max weight:30
                    {
                        p_weight+=add;// parcel weight increase

                        if(s.id===lastOrderId){
                        lastAdd=p_weight;
                        if(p_weight>30){
                            lastAdd=add;
                        }
                        }

                        if(p_weight>30){

                            test=1;

                            if(n_item>0){
                                p_item.item_id=s_item.id;// set one of parcel's item id
                                p_item.quantity=n_item;// only set item number in each parcel
                                parcel.items.push({...p_item});

                                test=2;
                            }
                            p_weight-=add;
                            await packingUp(parcel,s,lastOrderId);
                            lastOrderId=s.id;
                            exit=1;
                            n_item=1;
                            // reinitialize parcel
                            parcel.weight=add.toFixed(1);
                            p_weight=add;
                        }
                        else{
                            
                            if(s.id!==lastOrderId && lastOrderId!==""){
                                test=3;

                                p_weight=lastAdd;
                                await packingUp(parcel,s,orders.orders[i-1].id);
                                lastOrderId=s.id;
                                n_item=0;
                                p_weight=add;
                            }
                            parcel.weight=p_weight.toFixed(1);
                            n_item++;
                            p_item.item_id=s_item.id;// set one of parcel's item id
                            if(test===3){
                            //n_item=0;
                            test=0;
                            }
                        }
                    }
                    p_item.quantity=n_item;// only set item number in each parcel
                    parcel.items.push({...p_item});
                    
                }
            };
        }
        //console.log("order",s);
        
        if(i===limit || exit===0){
        test=4;
        await packingUp(parcel,s,s.id);
        }
        
    };
parcels.map((p)=>console.log("parcel",p));
console.log("remuneration",remuneration);
};

dropshipment();

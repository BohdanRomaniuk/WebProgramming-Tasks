const express = require('express');
const router = express.Router();
const pg = require('pg');
const path = require('path');
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:1234@localhost:5432/asus_shop';

//USER SESSION!!!!!!!
var sess;

//SELECT TOVARS
router.get('/server/index', (req, res, next) => {
	sess=req.session;
	const results = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC;');
    query.on('row', (row) => {
	  row.buy = (sess.username)?"unset":"none";	
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });

  });
});

//REGISTER NEW USER
router.post('/server/register', (req, res, next) => {
	var results = false;
	const data = {username: req.body.username, userpassword: req.body.userpassword, userrole: 'simple'};
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    client.query('INSERT INTO users(username, userpassword, userrole) values($1, $2, $3)', [data.username, data.userpassword, data.userrole]);
    const query = client.query('SELECT * FROM users WHERE username=($1) LIMIT 1', [data.username]);
    query.on('row', (row) => {
      results = true;
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//USER LOGIN FORM
router.post('/server/login', (req, res, next) => {
  var isLoggined = false;
  const data = {username: req.body.username, userpassword: req.body.userpassword};
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    const query = client.query('SELECT * FROM users WHERE username=($1) AND userpassword=($2) LIMIT 1', [data.username, data.userpassword]);
    query.on('row', (row) => {
		//START SESSION
		sess=req.session;
		sess.username=req.body.username;
		sess.userrole=row.userrole;
		//START SESSION
		isLoggined = true;
    });
    query.on('end', () => {
      done();
      return res.json(isLoggined);
    });
  });
});

//USER LOGOUT FORM
router.get('/server/logout', (req, res, next) => {
	req.session.destroy(function(err){
	if(err){
		console.log(err);
	}
	else
	{
		return res.json(true);
	}
  });
});

//NAVIGATION MENU
router.get('/server/navigation', (req, res, next) => {
	sess=req.session;
	const navelements = [];
navelements.push({name: 'main', href: '/', text: 'Головна'});
	if(sess.username)
	{
		navelements.push({name: 'bucket', href: 'bucket.html', text: 'Корзина'});
		navelements.push({name: 'profile', href: 'profile.html', text: 'Профіль ['+sess.username+']'});
		if(sess.userrole=='admin')
		{
			navelements.push({name: 'admin', href: '/admin/', text: 'Керування сайтом'});
		}
		navelements.push({name: 'logout', href: '/logout.html', text: 'Вийти'});
	}
	else
	{
		navelements.push({name: 'login', href: 'login.html', text: 'Вхід'});
		navelements.push({name: 'register', href: 'register.html', text: 'Реєстрація'});
	}
	return res.json(navelements);
});

//SELECT BUCKET TOVARS
router.get('/server/bucket', (req, res, next) => {
	sess=req.session;
	const results = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const data = {username: sess.username};
	const query = client.query('SELECT b.bucket_id, t.* FROM tovars AS t, buckets AS b WHERE b.tovar_id=t.tovar_id AND b.username=($1) AND b.cancel=false ORDER BY t.tovar_id ASC;', [data.username]);
    query.on('row', (row) => {
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });

  });
});

//SELECT CANCEL TOVARS
router.get('/server/cancels', (req, res, next) => {
	sess=req.session;
	const results = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const data = {username: sess.username};
	const query = client.query('SELECT b.bucket_id, t.* FROM tovars AS t, buckets AS b WHERE b.tovar_id=t.tovar_id AND b.username=($1) AND b.cancel=true ORDER BY t.tovar_id ASC;', [data.username]);
    query.on('row', (row) => {
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });

  });
});

//ADD TOVAR TO BUCKET
router.post('/server/addBucket/:tovar_id', (req, res, next) => {
  sess=req.session;
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const data = {username: sess.username, id: req.params.tovar_id};
    client.query('INSERT INTO buckets(username, tovar_id) VALUES($1, $2)', [data.username, data.id]);
    var query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC');
    query.on('row', (row) => {
	  row.buy = "unset";
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//DELETE TOVAR FROM BUCKET
router.delete('/server/deleteBucket/:bucket_id', (req, res, next) => {
  sess=req.session;
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const data = {username: sess.username};
    client.query('UPDATE buckets SET cancel=true WHERE bucket_id=($1);', [req.params.bucket_id]);
    var query = client.query('SELECT b.bucket_id, t.* FROM tovars AS t, buckets AS b WHERE b.tovar_id=t.tovar_id AND b.username=($1) AND b.cancel=false ORDER BY t.tovar_id ASC;', [data.username]);
    query.on('row', (row) => {
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//#
//#####-----------------[ADMIN PART]
//#
//SELECT TOVARS ADMIN PAGE
router.get('/server/admin/index', (req, res, next) => {
	sess=req.session;
	if(sess.userrole=='admin')
	{
	const results = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC;');
    query.on('row', (row) => {
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
	  row.del_action = (row.action==0)?"none":"unset";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });

  });
 }	
});

//ADD NEW TOVAR
router.post('/server/admin/add', (req, res, next) => {
	var createdSuccesfully = false;
	const data = {tovar_name: req.body.tovar_name, image_link: req.body.image_link, description: req.body.description, price: req.body.price};
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    const query = client.query('INSERT INTO tovars(tovar_name, image, description, price) VALUES($1,$2,$3,$4);', [data.tovar_name, data.image_link, data.description, data.price]);
    createdSuccesfully = true;
    query.on('end', () => {
      done();
      return res.json(createdSuccesfully);
    });
  });
});

//ADD ACTION TO TOVAR
router.post('/server/admin/addActionToTovar/:tovar_id&:action_amount', (req, res, next) => {
  sess=req.session;
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	const data = { id: req.params.tovar_id, amount: req.params.action_amount};
    client.query('UPDATE tovars SET action=($1) WHERE tovar_id=($2)', [data.amount, data.id]);
    var query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC');
    query.on('row', (row) => {
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
	  row.del_action = (row.action==0)?"none":"unset";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//DELETE ACTION FROM TOVAR
router.delete('/server/admin/deleteActionFromTovar/:tovar_id', (req, res, next) => {
  const results = [];
  const id = req.params.tovar_id;
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    client.query('UPDATE tovars SET action=0 WHERE tovar_id=($1)', [id]);
    var query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC');
    query.on('row', (row) => {
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
	  row.del_action = (row.action==0)?"none":"unset";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//DELETE TOVAR
router.delete('/server/admin/index/:tovar_id', (req, res, next) => {
  const results = [];
  const id = req.params.tovar_id;
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    client.query('DELETE FROM tovars WHERE tovar_id=($1)', [id]);
    var query = client.query('SELECT * FROM tovars ORDER BY tovar_id ASC');
    query.on('row', (row) => {
	  row.action = (row.action==0)?"":"Акція!!! -" + row.action + "% !!!";
	  row.del_action = (row.action==0)?"none":"unset";
      results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

module.exports = router;
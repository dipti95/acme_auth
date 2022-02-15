const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { user } = require('pg/lib/defaults');
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

const Note = conn.define('note', {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  //   console.log(token);
  try {
    const verifyToken = jwt.verify(token, process.env.JWT);
    // console.log(verifyToken.userId);
    if (verifyToken.userId) {
      const user = await User.findByPk(verifyToken.userId);
      if (user) {
        return user;
      }
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
      // password,
    },
  });

  // if(bcrypt.compare(password, user.password))
  // console.log(await bcrypt.compare(password, user.password));
  // console.log('password:', password);
  // console.log('user.password:', user.password);
  if (user) {
    // console.log(process.env.JWT);
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    return token;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

// console.log(user);
User.beforeCreate(async function (user) {
  const SALT_COUNT = 5;
  const hashedPassword = await bcrypt.hash(user.password, SALT_COUNT);
  user.password = hashedPassword;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [
    { text: 'hello world' },
    { text: 'reminder to buy groceries' },
    { text: 'reminder to do laundry' },
  ];
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};

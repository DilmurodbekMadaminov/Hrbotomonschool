import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

async function test() {
  const hdpLinkRef = doc(db, 'settings', 'hdp_link');
  const snap = await getDoc(hdpLinkRef);
  console.log('Exists:', snap.exists());
  if (!snap.exists()) {
    await setDoc(hdpLinkRef, { value: 'https://test.com' });
    console.log('Written');
  }
}

test().then(() => console.log('Done')).catch(e => console.error(e));

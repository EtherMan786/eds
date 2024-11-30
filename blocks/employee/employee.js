export default async function decorate(block) {
    const a = block.querySelector("a");
    const url = new URL(a.href);
    const res = await fetch(a.href);
    const json = await res.json();
    const data = json.data;
    console.log(data);
}
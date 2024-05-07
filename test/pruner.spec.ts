import { pruneFunction } from "../src/pruner"
import { join } from "path"

describe("pruner", () => {
  it("should prune unused properties", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: InF11): void {
        console.log(p.a);
      }
      type InF11 = Pick<A, "a">;
      function f2(p: A): void {
        const { a } = p;
      }
      function f3(p: A): void {
        const { a: num } = p;
      }`)
    )
  })

  it("should detect destructures", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: A): void {
        console.log(p.a);
      }
      function f2(p: InF21): void {
        const { a } = p;
      }
      type InF21 = Pick<A, "a">;
      function f3(p: A): void {
        const { a: num } = p;
      }`)
    )
  })

  it("should detect destructures with assignment", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f3", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: A): void {
        console.log(p.a);
      }
      function f2(p: A): void {
        const { a } = p;
      }
      function f3(p: InF31): void {
        const { a: num } = p;
      }
      type InF31 = Pick<A, "a">;`)
    )
  })

  it("shouldn't touch not object params", async () => {
    const filename = join(process.cwd(), "./testcases/t2.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(s: string, n: number, b: boolean, p: InF14): void {
        console.log(p.a);
      }
      type InF14 = Pick<A, "a">;
      function f2(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
        console.log(p.b);
      }
      `)
    )
  })

  it("shouldn't change anything if there is nothing to change", async () => {
    const filename = join(process.cwd(), "./testcases/t2.ts")

    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
      }
      function f2(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
        console.log(p.b);
      }`)
    )
  })
  it("only picks each field once on multiple access or initializing", async () => {
    const filename = join(process.cwd(), "./testcases/t3.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
        c: boolean;
      };
      function f1(p: InF11): void {
        console.log(p.a);
        console.log(p.b);
        console.log(p.b);
      }
      type InF11 = Pick<A, "a" | "b">;
      function f2(p: A): void {
        const { a, b } = p;
        const { a: a1, b: x } = p;
      }
      function f3(p: A): void {
        const { a, b } = p;
        console.log(p.a);
        console.log(p.b);
      }`)
    )
    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
        c: boolean;
      };
      function f1(p: A): void {
        console.log(p.a);
        console.log(p.b);
        console.log(p.b);
      }
      function f2(p: InF21): void {
        const { a, b } = p;
        const { a: a1, b: x } = p;
      }
      type InF21 = Pick<A, "a" | "b">;
      function f3(p: A): void {
        const { a, b } = p;
        console.log(p.a);
        console.log(p.b);
      }`)
    )
    expect(await format(pruneFunction("f3", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
        c: boolean;
      };
      function f1(p: A): void {
        console.log(p.a);
        console.log(p.b);
        console.log(p.b);
      }
      function f2(p: A): void {
        const { a, b } = p;
        const { a: a1, b: x } = p;
      }
      function f3(p: InF31): void {
        const { a, b } = p;
        console.log(p.a);
        console.log(p.b);
      }
      type InF31 = Pick<A, "a" | "b">;
      `)
    )
  })
  it("won't create a type when a whole object is passed to another function", async () => {
    const filename = join(process.cwd(), "./testcases/t4.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      type B = {
        a: number;
        b: string;
      };
      function f1(p: A, p2: InF12): void {
        console.log(p);
        console.log(p2.a);
      }
      type InF12 = Pick<B, "a">;
      function f2(p: A, p2: B): void {
        const { b } = p;
        console.log(p2.a);
      }`)
    )
  })
  it("create multiple types for multiple object parameters", async () => {
    const filename = join(process.cwd(), "./testcases/t4.ts")

    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      type B = {
        a: number;
        b: string;
      };
      function f1(p: A, p2: B): void {
        console.log(p);
        console.log(p2.a);
      }
      function f2(p: InF21, p2: InF22): void {
        const { b } = p;
        console.log(p2.a);
      }
      type InF21 = Pick<A, "b">;
      type InF22 = Pick<B, "a">;
      `)
    )
  })
  it("detect assign expression and create a type for that", async () => {
    const filename = join(process.cwd(), "./testcases/t5.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: InF11): void {
        p.a = 10;
      }
      type InF11 = Pick<A, "a">;
      `)
    )
  })
})

async function format(code: string | null): Promise<string> {
  if (code === null) return ""
  return code.replace(/\s/g, "")
}

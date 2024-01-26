basic functional tools that is written in typescript to support type of function convertion and use the intelisense

All these tools functions returns a new function
here fn means function

functions are :
compose
pipe
queue
ifSome
curry  
aim
fork  
guard
exploit

compose : the known compose nothing special
pipe : reverse compose
`queue : (...fns) : lastFn_result`
takes as many functions and executes them in the given order against passed arguments and returns last one's result

`ifSome : (...fns) : fn_result`
takes as many functions and executes them in the given order against passed arguments and terminates as soon as one of the functions returns true
used in situations when you are doing some filtering

`curry : (fn, args1) => (args2) => fn(args1, args2)` the known curry
`aim: (fn, args2) => (args1) => fn(args1, args2)` same as curry with a difference that the curried arguments will be concatnated to the passed arguments (notice that in curry the it's reverse)

`fork : (...fns) : any[]`
takes as many functions and executes them in the given order against passed arguments and returns the results as an array

`guard : (mainFn, ...fns) : mainFn_result | null`
it is meant for typescript and type convertion for exampel when you have a union type and you want to filter or specify what type it is by using guard type to pass as parameter to a function which only takes a type of that union

`exploit : (mainFn, ...fns) : mainFn_result | null`
takes a main function and many functions as filters and executes the main function if and only if the passed arguments satisfies any filter function
